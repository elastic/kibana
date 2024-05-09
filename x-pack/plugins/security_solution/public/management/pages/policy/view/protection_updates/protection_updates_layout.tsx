/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiCallOut,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiLink,
  EuiPanel,
  EuiShowFor,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ThemeContext } from 'styled-components';
import { i18n } from '@kbn/i18n';
import type { Moment } from 'moment';
import moment from 'moment';
import { cloneDeep } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { useGetProtectionUpdatesUnavailableComponent } from './hooks/use_get_protection_updates_unavailable_component';
import { ProtectionUpdatesBottomBar } from './components/protection_updates_bottom_bar';
import { useCreateProtectionUpdatesNote } from './hooks/use_post_protection_updates_note';
import { useGetProtectionUpdatesNote } from './hooks/use_get_protection_updates_note';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useKibana, useToasts } from '../../../../../common/lib/kibana';
import { useUpdateEndpointPolicy } from '../../../../hooks/policy/use_update_endpoint_policy';
import type { PolicyData, MaybeImmutable } from '../../../../../../common/endpoint/types';
import { ProtectionUpdatesWarningPanel } from './components/protection_updates_warning_panel';
import { getControlledArtifactCutoffDate } from '../../../../../../common/endpoint/utils/controlled_artifact_rollout';

interface ProtectionUpdatesLayoutProps {
  policy: MaybeImmutable<PolicyData>;
  setUnsavedChanges: (isModified: boolean) => void;
}

const AUTOMATIC_UPDATES_CHECKBOX_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.protectionUpdates.useAutomaticUpdates',
  {
    defaultMessage: 'Automatic updates enabled',
  }
);

const AUTOMATIC_UPDATES_OFF_CHECKBOX_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.protectionUpdates.useAutomaticUpdatesOff',
  {
    defaultMessage: 'Automatic updates disabled.',
  }
);

export const ProtectionUpdatesLayout = React.memo<ProtectionUpdatesLayoutProps>(
  ({ policy: _policy, setUnsavedChanges }) => {
    const toasts = useToasts();
    const dispatch = useDispatch();
    const { isLoading: isUpdating, mutateAsync: sendPolicyUpdate } = useUpdateEndpointPolicy();
    const { canWritePolicyManagement } = useUserPrivileges().endpointPrivileges;
    const { docLinks } = useKibana().services;

    const paddingSize = useContext(ThemeContext).eui.euiPanelPaddingModifiers.paddingMedium;

    const policy = _policy as PolicyData;
    const deployedVersion = policy.inputs[0].config.policy.value.global_manifest_version;
    const [manifestVersion, setManifestVersion] = useState(deployedVersion);

    const today = moment.utc();
    const defaultDate = today.clone().subtract(1, 'days');

    const [selectedDate, setSelectedDate] = useState<Moment>(defaultDate);

    const { data: fetchedNote, isLoading: getNoteInProgress } = useGetProtectionUpdatesNote({
      packagePolicyId: _policy.id,
    });
    const { isLoading: createNoteInProgress, mutate: createNote } = useCreateProtectionUpdatesNote({
      packagePolicyId: _policy.id,
    });
    const [note, setNote] = useState('');

    useEffect(() => {
      if (fetchedNote && !getNoteInProgress) {
        setNote(fetchedNote.note);
      }
    }, [fetchedNote, getNoteInProgress]);

    const automaticUpdatesEnabled = manifestVersion === 'latest';
    const internalDateFormat = 'YYYY-MM-DD';
    const displayDateFormat = 'MMMM DD, YYYY';
    const formattedDate = moment.utc(deployedVersion, internalDateFormat).format(displayDateFormat);
    const cutoffDate = getControlledArtifactCutoffDate(); // Earliest selectable date

    const viewModeSwitchLabel = automaticUpdatesEnabled
      ? AUTOMATIC_UPDATES_CHECKBOX_LABEL
      : AUTOMATIC_UPDATES_OFF_CHECKBOX_LABEL;

    const saveButtonEnabled =
      (fetchedNote ? note !== fetchedNote.note : note !== '') ||
      manifestVersion !== deployedVersion;

    useEffect(() => {
      setUnsavedChanges(saveButtonEnabled);
    }, [saveButtonEnabled, setUnsavedChanges]);

    const onSave = useCallback(() => {
      const update = cloneDeep(policy);
      update.inputs[0].config.policy.value.global_manifest_version = manifestVersion;
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
      if ((!fetchedNote && note !== '') || (fetchedNote && note !== fetchedNote.note)) {
        createNote(
          { note },
          {
            onError: (error) => {
              toasts.addDanger({
                'data-test-subj': 'protectionUpdatesNoteUpdateFailureMessage',
                title: i18n.translate(
                  'xpack.securitySolution.endpoint.protectionUpdates.noteUpdateErrorTitle',
                  {
                    defaultMessage: 'Note update failed!',
                  }
                ),
                text: error.body.message,
              });
            },
          }
        );
      }
    }, [
      policy,
      manifestVersion,
      sendPolicyUpdate,
      fetchedNote,
      note,
      toasts,
      dispatch,
      createNote,
    ]);

    const toggleAutomaticUpdates = useCallback(
      (event: EuiSwitchEvent) => {
        const { checked } = event.target;

        if (checked && !automaticUpdatesEnabled) {
          setManifestVersion('latest');
          // Clear selected date on user enabling automatic updates
          if (selectedDate !== defaultDate) {
            setSelectedDate(defaultDate);
          }
        } else {
          setManifestVersion(selectedDate.format(internalDateFormat));
        }
      },
      [automaticUpdatesEnabled, selectedDate, defaultDate]
    );

    const updateDatepickerSelectedDate = useCallback(
      (date: Moment | null) => {
        if (date?.isAfter(cutoffDate) && date?.isSameOrBefore(defaultDate)) {
          setSelectedDate(date || defaultDate);
          setManifestVersion(date?.format(internalDateFormat) || 'latest');
        }
      },
      [cutoffDate, defaultDate]
    );

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
            <div data-test-subj={'protection-updates-version-to-deploy-picker'}>
              <EuiDatePicker
                popoverPlacement={'downCenter'}
                dateFormat={displayDateFormat}
                selected={selectedDate}
                maxDate={defaultDate}
                minDate={cutoffDate}
                onChange={updateDatepickerSelectedDate}
              />
            </div>
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

      const deployedVersionDate = moment.utc(deployedVersion).format(internalDateFormat);
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
            <FormattedMessage
              id="xpack.securitySolution.endpoint.protectionUpdates.manifestOutdated"
              defaultMessage="Your protection artifacts have not been updated in over 30 days. We strongly recommend keeping these up to date to ensure the highest level of security for your environment.{break}Note: After 18 months, protection artifacts will expire and cannot be rolled back. {learnMore}"
              values={{
                learnMore: (
                  <EuiLink
                    href={docLinks.links.securitySolution.artifactControl}
                    target="_blank"
                    external
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.protectionUpdates.manifestOutdated.learnMore"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                ),
                break: <EuiSpacer size="m" />,
              }}
            />
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
            <FormattedMessage
              id="xpack.securitySolution.endpoint.protectionUpdates.automaticUpdates.enabled"
              defaultMessage="Protection updates will always be updated to the latest available version. If you want to control updates manually, disable the {toggleName} toggle."
              values={{
                toggleName: (
                  <strong>
                    {i18n.translate(
                      'xpack.securitySolution.endpoint.protectionUpdates.automaticUpdates.enabled.toggleName',
                      {
                        defaultMessage: 'Enable automatic updates',
                      }
                    )}
                  </strong>
                ),
              }}
            />
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
          {(canWritePolicyManagement || note) && (
            <>
              <EuiSpacer size="m" />
              <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
                <EuiTitle size="xxs" data-test-subj={'protection-updates-manifest-name-note-title'}>
                  <h5>
                    {i18n.translate(
                      'xpack.securitySolution.endpoint.protectionUpdates.note.label',
                      {
                        defaultMessage: 'Note',
                      }
                    )}
                  </h5>
                </EuiTitle>
                <EuiIconTip
                  position="right"
                  content={
                    <>
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.protectionUpdates.note.tooltip"
                        defaultMessage="You can add an optional note to explain the reason for selecting a particular policy version."
                      />
                    </>
                  }
                />
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              {canWritePolicyManagement ? (
                <EuiTextArea
                  value={note}
                  disabled={getNoteInProgress || createNoteInProgress}
                  onChange={(e) => setNote(e.target.value)}
                  fullWidth
                  rows={3}
                  placeholder={i18n.translate(
                    'xpack.securitySolution.endpoint.protectionUpdates.note.placeholder',
                    {
                      defaultMessage: 'Add relevant information about update here',
                    }
                  )}
                  data-test-subj={'protection-updates-manifest-note'}
                />
              ) : (
                <EuiText data-test-subj={'protection-updates-manifest-note-view-mode'}>
                  {note}
                </EuiText>
              )}
            </>
          )}
        </>
      );
    };

    const ProtectionUpdatesUpsellingComponent = useGetProtectionUpdatesUnavailableComponent();

    if (ProtectionUpdatesUpsellingComponent) {
      return <ProtectionUpdatesUpsellingComponent />;
    }

    return (
      <>
        <EuiPanel
          data-test-subject="protection-updates-layout"
          hasBorder
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
                  {i18n.translate('xpack.securitySolution.endpoint.protectionUpdates.title', {
                    defaultMessage: 'Manage protection updates',
                  })}
                </h5>
              </EuiTitle>
            </EuiFlexItem>
            <EuiShowFor sizes={['l', 'xl', 'm']}>
              {canWritePolicyManagement ? (
                <EuiSwitch
                  disabled={isUpdating || createNoteInProgress || getNoteInProgress}
                  label={i18n.translate(
                    'xpack.securitySolution.endpoint.protectionUpdates.enableAutomaticUpdates',
                    {
                      defaultMessage: 'Enable automatic updates',
                    }
                  )}
                  labelProps={{ 'data-test-subj': 'protection-updates-manifest-switch-label' }}
                  checked={automaticUpdatesEnabled}
                  onChange={toggleAutomaticUpdates}
                  data-test-subj={'protection-updates-manifest-switch'}
                />
              ) : (
                <EuiText data-test-subj={'protection-updates-state-view-mode'}>
                  {viewModeSwitchLabel}
                </EuiText>
              )}
            </EuiShowFor>
          </EuiFlexGroup>

          <EuiHorizontalRule margin="m" />
          <EuiSpacer size="m" />
          <div style={{ padding: `0 ${paddingSize} ${paddingSize} ${paddingSize}` }}>
            <ProtectionUpdatesWarningPanel />
            <EuiSpacer size="m" />
            {renderManifestOutdatedCallOut()}
            {renderContent()}
          </div>
        </EuiPanel>
        <ProtectionUpdatesBottomBar
          isUpdating={isUpdating}
          saveButtonDisabled={!canWritePolicyManagement || !saveButtonEnabled}
          onSave={onSave}
        />
      </>
    );
  }
);

ProtectionUpdatesLayout.displayName = 'ProtectionUpdatesLayout';
