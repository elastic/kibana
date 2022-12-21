/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiPanel,
  EuiText,
  EuiButton,
  EuiButtonIcon,
  EuiSpacer,
  EuiToolTip,
  EuiCallOut,
  EuiContextMenu,
  EuiPopover,
} from '@elastic/eui';

import { useServices } from '../../../../app_context';
import {
  RetentionSettingsUpdateModalProvider,
  UpdateRetentionSettings,
  RetentionExecuteModalProvider,
  ExecuteRetention,
} from '../../../../components';

interface Props {
  retentionSettings: {
    retentionSchedule: string;
  };
  onRetentionScheduleUpdated: () => void;
  isLoading: boolean;
  error: any;
}

export const PolicyRetentionSchedule: React.FunctionComponent<Props> = ({
  retentionSettings,
  onRetentionScheduleUpdated,
  isLoading,
  error,
}) => {
  const { i18n } = useServices();

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const renderRetentionPanel = (cronSchedule: string) => (
    <>
      <EuiPanel hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.snapshotRestore.policyRetentionSchedulePanel.retentionScheduleDescription"
                  defaultMessage="The cron schedule for retaining snapshots is: {cronSchedule}."
                  values={{ cronSchedule: <strong>{cronSchedule}</strong> }}
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {/** Run retention schedule prompt */}
              <EuiFlexItem grow={false}>
                <RetentionExecuteModalProvider>
                  {(executeRetentionPrompt: ExecuteRetention) => {
                    return (
                      <EuiToolTip
                        position="top"
                        content={
                          <FormattedMessage
                            id="xpack.snapshotRestore.policyRetentionSchedulePanel.retentionScheduleExecuteLinkTooltip"
                            defaultMessage="Run retention now"
                          />
                        }
                      >
                        <EuiButtonIcon
                          iconType="play"
                          onClick={() => executeRetentionPrompt()}
                          aria-label={i18n.translate(
                            'xpack.snapshotRestore.policyRetentionSchedulePanel.retentionScheduleExecuteLinkAriaLabel',
                            {
                              defaultMessage: 'Run retention now',
                            }
                          )}
                        />
                      </EuiToolTip>
                    );
                  }}
                </RetentionExecuteModalProvider>
              </EuiFlexItem>
              {/** Edit retention schedule prompt */}
              <EuiFlexItem grow={false}>
                <RetentionSettingsUpdateModalProvider>
                  {(updateRetentionPrompt: UpdateRetentionSettings) => {
                    return (
                      <EuiToolTip
                        position="top"
                        content={
                          <FormattedMessage
                            id="xpack.snapshotRestore.policyRetentionSchedulePanel.retentionScheduleEditLinkTooltip"
                            defaultMessage="Edit retention schedule"
                          />
                        }
                      >
                        <EuiButtonIcon
                          iconType="pencil"
                          onClick={() =>
                            updateRetentionPrompt(cronSchedule, onRetentionScheduleUpdated)
                          }
                          aria-label={i18n.translate(
                            'xpack.snapshotRestore.policyRetentionSchedulePanel.retentionScheduleEditLinkAriaLabel',
                            {
                              defaultMessage: 'Edit retention schedule',
                            }
                          )}
                        />
                      </EuiToolTip>
                    );
                  }}
                </RetentionSettingsUpdateModalProvider>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer />
    </>
  );

  const renderRetentionNotConfiguredCallout = () => (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.policyRetentionSchedulePanel.noScheduleConfiguredWarningTitle"
            defaultMessage="Retention not scheduled"
          />
        }
        color="warning"
        iconType="alert"
      >
        <p>
          <FormattedMessage
            id="xpack.snapshotRestore.policyRetentionSchedulePanel.noScheduleConfiguredWarningDescription"
            defaultMessage="One or more policies have a retention period, but no retention is scheduled."
          />
        </p>
        <RetentionExecuteModalProvider>
          {(executeRetentionPrompt) => {
            return (
              <RetentionSettingsUpdateModalProvider>
                {(updateRetentionSettingsPrompt) => {
                  return (
                    <EuiPopover
                      id="retentionActionMenu"
                      button={
                        <EuiButton
                          data-test-subj="retentionActionMenuButton"
                          iconSide="right"
                          color="warning"
                          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                          iconType="arrowDown"
                        >
                          <FormattedMessage
                            id="xpack.snapshotRestore.policyRetentionSchedulePanel.manageRetentionButtonLabel"
                            defaultMessage="Manage retention"
                          />
                        </EuiButton>
                      }
                      isOpen={isPopoverOpen}
                      closePopover={() => setIsPopoverOpen(false)}
                      panelPaddingSize="none"
                      anchorPosition="rightUp"
                      repositionOnScroll
                    >
                      <EuiContextMenu
                        data-test-subj="retentionActionContextMenu"
                        initialPanelId={0}
                        panels={[
                          {
                            id: 0,
                            title: i18n.translate(
                              'xpack.snapshotRestore.policyRetentionSchedulePanel.managePanelTitle',
                              {
                                defaultMessage: 'Retention options',
                              }
                            ),
                            items: [
                              {
                                name: i18n.translate(
                                  'xpack.snapshotRestore.policyRetentionSchedulePanel.executeButtonLabel',
                                  {
                                    defaultMessage: 'Run now',
                                  }
                                ),
                                icon: 'play',
                                onClick: () => executeRetentionPrompt(),
                              },
                              {
                                name: i18n.translate(
                                  'xpack.snapshotRestore.policyRetentionSchedulePanel.addButtonLabel',
                                  {
                                    defaultMessage: 'Schedule',
                                  }
                                ),
                                icon: 'plusInCircle',
                                onClick: () =>
                                  updateRetentionSettingsPrompt(
                                    undefined,
                                    onRetentionScheduleUpdated
                                  ),
                              },
                            ],
                          },
                        ]}
                      />
                    </EuiPopover>
                  );
                }}
              </RetentionSettingsUpdateModalProvider>
            );
          }}
        </RetentionExecuteModalProvider>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );

  if (isLoading) {
    return (
      <Fragment>
        <EuiPanel>
          <EuiLoadingContent lines={1} />
        </EuiPanel>
        <EuiSpacer />
      </Fragment>
    );
  }

  if (error) {
    return (
      <Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.policyRetentionSchedulePanel.errorFetchingRetentionScheduleTitle"
              defaultMessage="Error fetching retention schedule"
            />
          }
          color="danger"
          iconType="alert"
        >
          {error.data && error.data.message ? <p>{error.data.message}</p> : null}
          <EuiButton iconType="refresh" color="danger" onClick={onRetentionScheduleUpdated}>
            <FormattedMessage
              id="xpack.snapshotRestore.policyRetentionSchedulePanel.errorFetchingRetentionScheduleReloadButtonLabel"
              defaultMessage="Reload"
            />
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer />
      </Fragment>
    );
  }

  if (retentionSettings && retentionSettings.retentionSchedule) {
    return renderRetentionPanel(retentionSettings.retentionSchedule);
  }
  return renderRetentionNotConfiguredCallout();
};
