/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiButton,
  EuiCallOut,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiShowFor,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ThemeContext } from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Moment } from 'moment';
import moment from 'moment';
import { cloneDeep } from 'lodash';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useToasts } from '../../../../../common/lib/kibana';
import { useUpdateEndpointPolicy } from '../../../../hooks/policy/use_update_endpoint_policy';
import type { PolicyData, MaybeImmutable } from '../../../../../../common/endpoint/types';

interface ProtectionUpdatesLayoutProps {
  policy: MaybeImmutable<PolicyData>;
}

const AUTOMATIC_UPDATES_CHECKBOX_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.protectionUpdates.useAutomaticUpdates',
  {
    defaultMessage: 'Use automatic updates',
  }
);

const AUTOMATIC_UPDATES_OFF_CHECKBOX_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.protectionUpdates.useAutomaticUpdatesOff',
  {
    defaultMessage: "Don't use automatic updates",
  }
);

export const ProtectionUpdatesLayout = React.memo<ProtectionUpdatesLayoutProps>(
  ({ policy: _policy }) => {
    const toasts = useToasts();
    const dispatch = useDispatch();
    const { isLoading: isUpdating, mutateAsync: sendPolicyUpdate } = useUpdateEndpointPolicy();
    const { canWritePolicyManagement } = useUserPrivileges().endpointPrivileges;

    const paddingSize = useContext(ThemeContext).eui.euiPanelPaddingModifiers.paddingMedium;

    const policy = _policy as PolicyData;
    const deployedVersion = policy.inputs[0].config.policy.value.manifest_version;
    const [manifestVersion, setManifestVersion] = useState(deployedVersion);

    const today = moment();
    const [selectedDate, setSelectedDate] = useState<Moment>(today);

    const automaticUpdatesEnabled = manifestVersion === 'latest';
    const internalDateFormat = 'YYYY-MM-DD';
    const displayDateFormat = 'MMMM DD, YYYY';
    const formattedDate = moment(deployedVersion, internalDateFormat).format(displayDateFormat);
    const cutoffDate = moment().subtract(18, 'months'); // Earliest selectable date

    const viewModeSwitchLabel = automaticUpdatesEnabled
      ? AUTOMATIC_UPDATES_CHECKBOX_LABEL
      : AUTOMATIC_UPDATES_OFF_CHECKBOX_LABEL;

    useEffect(() => {
      if (automaticUpdatesEnabled && selectedDate !== today) {
        // Clear selected date on user enabling automatic updates
        setSelectedDate(today);
      }
    }, [automaticUpdatesEnabled, selectedDate, today]);

    const onSave = useCallback(() => {
      const update = cloneDeep(policy);
      update.inputs[0].config.policy.value.manifest_version = manifestVersion;
      sendPolicyUpdate({ policy: update })
        .then(({ item: policyItem }) => {
          toasts.addSuccess({
            'data-test-subj': 'protectionUpdatesSuccessfulMessage',
            title: i18n.translate(
              'xpack.securitySolution.endpoint.protectionUpdates.updateSuccessTitle',
              {
                defaultMessage: 'Success!',
              }
            ),
            text: i18n.translate(
              'xpack.securitySolution.endpoint.protectionUpdates.updateSuccessMessage',
              {
                defaultMessage: 'Manifest updates successfully saved',
              }
            ),
          });

          // Since the 'policyItem' is stored in a store and fetched as a result of an action on urlChange, we still need to dispatch an action even though Redux was removed from this component.
          dispatch({
            type: 'serverReturnedPolicyDetailsData',
            payload: {
              policyItem,
            },
          });
        })
        .catch((err) => {
          toasts.addDanger({
            'data-test-subj': 'protectionUpdatesFailureMessage',
            title: i18n.translate(
              'xpack.securitySolution.endpoint.protectionUpdates.updateErrorTitle',
              {
                defaultMessage: 'Failed!',
              }
            ),
            text: err.message,
          });
        });
    }, [dispatch, manifestVersion, policy, sendPolicyUpdate, toasts]);

    const toggleAutomaticUpdates = useCallback(
      (event: EuiSwitchEvent) => {
        const { checked } = event.target;

        if (checked && !automaticUpdatesEnabled) {
          setManifestVersion('latest');
        } else {
          setManifestVersion(selectedDate.format(internalDateFormat));
        }
      },
      [automaticUpdatesEnabled, selectedDate]
    );

    useEffect(() => {
      // User turned on automatic updates, we need to save the policy without the user clicking save button
      if (deployedVersion !== manifestVersion && manifestVersion === 'latest') {
        onSave();
      }
    }, [deployedVersion, manifestVersion, onSave]);

    const renderVersionToDeployPicker = () => {
      return (
        <>
          <EuiTitle
            size="xxs"
            data-test-subj={'protection-updates-manifest-name-version-to-deploy-title'}
          >
            <h5>
              {i18n.translate(
                'xpack.securitySolution.endpoint.protectionUpdates.versionToDeploy.label',
                {
                  defaultMessage: 'Version to deploy',
                }
              )}
            </h5>
          </EuiTitle>
          <EuiSpacer size="m" />
          {canWritePolicyManagement ? (
            <EuiDatePicker
              popoverPlacement={'upCenter'}
              dateFormat={displayDateFormat}
              selected={selectedDate}
              maxDate={today}
              minDate={cutoffDate}
              onChange={(date) => {
                setSelectedDate(date || today);
                setManifestVersion(date?.format(internalDateFormat) || 'latest');
              }}
            />
          ) : (
            <EuiText size="m" data-test-subj="protection-updates-version-to-deploy-view-mode">
              {selectedDate.format(displayDateFormat)}
            </EuiText>
          )}
        </>
      );
    };

    const renderManifestOutdatedCallOut = () => {
      if (automaticUpdatesEnabled || deployedVersion === 'latest') {
        return null;
      }

      const deployedVersionDate = moment(deployedVersion).format(internalDateFormat);
      const daysSinceLastUpdate = today.diff(deployedVersionDate, 'days');

      if (daysSinceLastUpdate < 30) {
        return null;
      }

      return (
        <>
          <EuiCallOut
            color={'warning'}
            iconType={'alert'}
            size="m"
            data-test-subj="protection-updates-manifest-outdated"
            title={i18n.translate(
              'xpack.securitySolution.endpoint.protectionUpdates.manifestOutdated.title',
              {
                defaultMessage: 'Manifest outdated',
              }
            )}
          >
            {i18n.translate('xpack.securitySolution.endpoint.protectionUpdates.manifestOutdated', {
              defaultMessage:
                'Manifest is older than 30 days. Recommended to update the manifest or enable "Update manifest automatically".',
            })}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      );
    };

    const renderContent = () => {
      if (automaticUpdatesEnabled) {
        return (
          <EuiCallOut
            color={'primary'}
            iconType={'iInCircle'}
            size="m"
            data-test-subj="protection-updates-automatic-updates-enabled"
            title={i18n.translate(
              'xpack.securitySolution.endpoint.protectionUpdates.automaticUpdates.enabledTitle',
              {
                defaultMessage: 'Automatic updates enabled',
              }
            )}
          >
            {i18n.translate(
              'xpack.securitySolution.endpoint.protectionUpdates.automaticUpdates.enabled',
              {
                defaultMessage:
                  'Manifest will always be updated to the latest available version. If you want to control updates manually, disable "Update manifest automatically".',
              }
            )}
          </EuiCallOut>
        );
      }
      return (
        <>
          <EuiTitle
            size="xxs"
            data-test-subj={'protection-updates-manifest-name-deployed-version-title'}
          >
            <h5>
              {i18n.translate(
                'xpack.securitySolution.endpoint.protectionUpdates.deployedVersion.label',
                {
                  defaultMessage: 'Currently deployed version',
                }
              )}
            </h5>
          </EuiTitle>
          <EuiSpacer size="m" />

          <EuiText size="m" data-test-subj="protection-updates-deployed-version">
            {deployedVersion === 'latest' ? 'latest' : formattedDate}
          </EuiText>
          <EuiSpacer size="l" />
          {renderVersionToDeployPicker()}

          <EuiSpacer size="m" />
          {/* <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">*/}
          {/*  <EuiTitle size="xxs" data-test-subj={'protection-updates-manifest-name-note-title'}>*/}
          {/*    <h5>*/}
          {/*      {i18n.translate('xpack.securitySolution.endpoint.protectionUpdates.note.label', {*/}
          {/*        defaultMessage: 'Note',*/}
          {/*      })}*/}
          {/*    </h5>*/}
          {/*  </EuiTitle>*/}
          {/*  <EuiIconTip*/}
          {/*    position="right"*/}
          {/*    content={*/}
          {/*      <>*/}
          {/*        <FormattedMessage*/}
          {/*          id="xpack.securitySolution.endpoint.protectionUpdates.note.tooltip"*/}
          {/*          defaultMessage="Note will help you understand why you decided to deploy a particular version next time you access policy update."*/}
          {/*        />*/}
          {/*      </>*/}
          {/*    }*/}
          {/*  />*/}
          {/* </EuiFlexGroup>*/}
          {/* <EuiSpacer size="m" />*/}

          {/* <EuiTextArea*/}
          {/*  value={''}*/}
          {/*  onChange={() => console.log('test')}*/}
          {/*  fullWidth={true}*/}
          {/*  rows={3}*/}
          {/*  placeholder={i18n.translate(*/}
          {/*    'xpack.securitySolution.endpoint.protectionUpdates.note.placeholder',*/}
          {/*    {*/}
          {/*      defaultMessage: 'Add relevant information about update here',*/}
          {/*    }*/}
          {/*  )}*/}
          {/*  data-test-subj={'protection-updates-manifest-note'}*/}
          {/* />*/}
          {/* <EuiSpacer size="m" />*/}

          <EuiButton
            fill={true}
            disabled={!canWritePolicyManagement}
            iconType="save"
            data-test-subj="policyDetailsSaveButton"
            onClick={onSave}
            isLoading={isUpdating}
          >
            <FormattedMessage
              id="xpack.securitySolution.endpoint.protectionUpdates.saveButton"
              defaultMessage="Save updates"
            />
          </EuiButton>
        </>
      );
    };

    return (
      <EuiPanel
        data-test-subject="protection-updates-layout"
        hasBorder={true}
        hasShadow={false}
        paddingSize="none"
      >
        <EuiFlexGroup
          direction="row"
          gutterSize="none"
          alignItems="center"
          style={{ padding: `${paddingSize} ${paddingSize} 0 ${paddingSize}` }}
        >
          <EuiFlexItem grow={1}>
            <EuiTitle size="xxs" data-test-subj={'protection-updates-manifest-name-title'}>
              <h5>
                {i18n.translate('xpack.securitySolution.endpoint.protectionUpdates.manifestName', {
                  defaultMessage: 'Manifest name',
                })}
              </h5>
            </EuiTitle>
            <EuiText size="m" data-test-subj="protection-updates-manifest-name">
              {'artifactsec'}
            </EuiText>
          </EuiFlexItem>
          <EuiShowFor sizes={['l', 'xl', 'm']}>
            {canWritePolicyManagement ? (
              <EuiSwitch
                disabled={isUpdating}
                label={'Update manifest automatically'}
                labelProps={{ 'data-test-subj': 'protection-updates-manifest-switch-label' }}
                checked={automaticUpdatesEnabled}
                onChange={toggleAutomaticUpdates}
                data-test-subj={'protection-updates-manifest-switch'}
              />
            ) : (
              <>{viewModeSwitchLabel}</>
            )}
          </EuiShowFor>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="m" />
        <EuiSpacer size="m" />
        <div style={{ padding: `0 ${paddingSize} ${paddingSize} ${paddingSize}` }}>
          {renderManifestOutdatedCallOut()}
          {renderContent()}
        </div>
      </EuiPanel>
    );
  }
);

ProtectionUpdatesLayout.displayName = 'ProtectionUpdatesLayout';
