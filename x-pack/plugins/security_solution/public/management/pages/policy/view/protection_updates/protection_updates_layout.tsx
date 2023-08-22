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
  EuiIconTip,
  EuiPanel,
  EuiShowFor,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ThemeContext } from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Moment } from 'moment';
import moment from 'moment';
import { cloneDeep } from 'lodash';
import { useToasts } from '../../../../../common/lib/kibana';
import { useUpdateEndpointPolicy } from '../../../../hooks/policy/use_update_endpoint_policy';
import type { PolicyData, MaybeImmutable } from '../../../../../../common/endpoint/types';

interface ProtectionUpdatesLayoutProps {
  policy: MaybeImmutable<PolicyData>;
}

export const ProtectionUpdatesLayout = React.memo<ProtectionUpdatesLayoutProps>(
  ({ policy: _policy }) => {
    const toasts = useToasts();
    const paddingSize = useContext(ThemeContext).eui.euiPanelPaddingModifiers.paddingMedium;
    const { isLoading: isUpdating, mutateAsync: sendPolicyUpdate } = useUpdateEndpointPolicy();

    const policy = _policy as PolicyData;
    const deployedVersion = policy.inputs[0].config.policy.value.manifest_version;

    const [manifestVersion, setManifestVersion] = useState(deployedVersion);

    const automaticUpdatesEnabled = manifestVersion === 'latest';
    const unifiedDateFormat = 'YYYY-MM-DD';

    const today = moment();
    const cutoffDate = moment().subtract(18, 'months');
    const [startDate, setStartDate] = useState<Moment>(today);

    const onSave = useCallback(() => {
      const update = cloneDeep(policy);
      update.inputs[0].config.policy.value.manifest_version = manifestVersion;
      sendPolicyUpdate({ policy: update })
        .then(() => {
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
        })
        .catch((err) => {
          toasts.addDanger({
            'data-test-subj': 'protectionUpdatesFailureMessage',
            title: i18n.translate(
              'xxpack.securitySolution.endpoint.protectionUpdates.updateErrorTitle',
              {
                defaultMessage: 'Failed!',
              }
            ),
            text: err.message,
          });
        });
    }, [manifestVersion, policy, sendPolicyUpdate, toasts]);

    const toggleAutomaticUpdates = useCallback(
      (event: EuiSwitchEvent) => {
        const { checked } = event.target;

        if (checked && !automaticUpdatesEnabled) {
          setManifestVersion('latest');
        } else {
          setManifestVersion(startDate.format(unifiedDateFormat));
        }
      },
      [automaticUpdatesEnabled, startDate]
    );

    useEffect(() => {
      // User turned on automatic updates, we need to save the policy without the user clicking save
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
          <EuiDatePicker
            popoverPlacement={'upCenter'}
            dateFormat={'MMMM DD, YYYY'}
            selected={startDate}
            maxDate={today}
            minDate={cutoffDate}
            onChange={(date) => {
              setStartDate(date || today);
              setManifestVersion(date?.format(unifiedDateFormat) || 'latest');
            }}
          />
        </>
      );
    };

    const renderManifestOutdatedCallOut = () => {
      if (automaticUpdatesEnabled || deployedVersion === 'latest') {
        return null;
      }

      const deployedVersionDate = moment(deployedVersion).format(unifiedDateFormat);
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
            {deployedVersion}
          </EuiText>
          <EuiSpacer size="l" />
          {renderVersionToDeployPicker()}

          <EuiSpacer size="m" />
          <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
            <EuiTitle size="xxs" data-test-subj={'protection-updates-manifest-name-note-title'}>
              <h5>
                {i18n.translate('xpack.securitySolution.endpoint.protectionUpdates.note.label', {
                  defaultMessage: 'Note',
                })}
              </h5>
            </EuiTitle>
            <EuiIconTip
              position="right"
              content={
                <>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.protectionUpdates.note.tooltip"
                    defaultMessage="Note will help you understand why you decided to deploy a particular version next time you access policy update."
                  />
                </>
              }
            />
          </EuiFlexGroup>
          <EuiSpacer size="m" />

          <EuiTextArea
            value={''}
            onChange={() => console.log('test')}
            fullWidth={true}
            rows={2}
            placeholder={i18n.translate(
              'xpack.securitySolution.endpoint.protectionUpdates.note.placeholder',
              {
                defaultMessage: 'Add relevant information about update here',
              }
            )}
            data-test-subj={'protection-updates-manifest-note'}
          />
          <EuiSpacer size="m" />

          <EuiButton
            fill={true}
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
            <EuiSwitch
              disabled={isUpdating}
              label={'Update manifest automatically'}
              labelProps={{ 'data-test-subj': 'protection-updates-manifest-switch-label' }}
              checked={automaticUpdatesEnabled}
              onChange={toggleAutomaticUpdates}
              data-test-subj={'protection-updates-manifest-switch'}
            />
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
