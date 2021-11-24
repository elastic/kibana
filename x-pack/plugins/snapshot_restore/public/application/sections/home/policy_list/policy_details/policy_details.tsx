/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiTabs,
  EuiTab,
  EuiButton,
  EuiPopover,
  EuiContextMenu,
  EuiButtonIcon,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';

import { reactRouterNavigate } from '../../../../../../../../../src/plugins/kibana_react/public';

import { SlmPolicy } from '../../../../../../common/types';
import { useServices } from '../../../../app_context';
import { SectionError, Error } from '../../../../../shared_imports';
import {
  UIM_POLICY_DETAIL_PANEL_SUMMARY_TAB,
  UIM_POLICY_DETAIL_PANEL_HISTORY_TAB,
} from '../../../../constants';
import { useLoadPolicy } from '../../../../services/http';
import { linkToEditPolicy, linkToSnapshot } from '../../../../services/navigation';

import {
  SectionLoading,
  InlineLoading,
  PolicyExecuteProvider,
  PolicyDeleteProvider,
} from '../../../../components';
import { TabSummary, TabHistory } from './tabs';

interface Props {
  policyName: SlmPolicy['name'];
  onClose: () => void;
  onPolicyDeleted: (policiesDeleted: Array<SlmPolicy['name']>) => void;
  onPolicyExecuted: () => void;
}

const TAB_SUMMARY = 'summary';
const TAB_HISTORY = 'success';

const tabToUiMetricMap: { [key: string]: string } = {
  [TAB_SUMMARY]: UIM_POLICY_DETAIL_PANEL_SUMMARY_TAB,
  [TAB_HISTORY]: UIM_POLICY_DETAIL_PANEL_HISTORY_TAB,
};

export const PolicyDetails: React.FunctionComponent<Props> = ({
  policyName,
  onClose,
  onPolicyDeleted,
  onPolicyExecuted,
}) => {
  const { i18n, uiMetricService, history } = useServices();
  const { error, data: policyDetails, resendRequest: reload } = useLoadPolicy(policyName);
  const [activeTab, setActiveTab] = useState<string>(TAB_SUMMARY);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  // Reset tab when we look at a different policy
  useEffect(() => {
    setActiveTab(TAB_SUMMARY);
  }, [policyName]);

  const tabOptions = [
    {
      id: TAB_SUMMARY,
      name: (
        <FormattedMessage
          id="xpack.snapshotRestore.policyDetails.summaryTabTitle"
          defaultMessage="Summary"
        />
      ),
    },
    {
      id: TAB_HISTORY,
      name: (
        <FormattedMessage
          id="xpack.snapshotRestore.policyDetails.historyTabTitle"
          defaultMessage="History"
        />
      ),
    },
  ];

  const renderTabs = () => (
    <EuiTabs>
      {tabOptions.map((tab) => (
        <EuiTab
          onClick={() => {
            uiMetricService.trackUiMetric(tabToUiMetricMap[tab.id]);
            setActiveTab(tab.id);
          }}
          isSelected={tab.id === activeTab}
          key={tab.id}
          data-test-subj="tab"
        >
          {tab.name}
        </EuiTab>
      ))}
    </EuiTabs>
  );

  const renderBody = () => {
    if (policyDetails) {
      const { policy } = policyDetails;

      switch (activeTab) {
        case TAB_HISTORY:
          return <TabHistory policy={policy} />;
        default:
          return <TabSummary policy={policy} />;
      }
    }
    if (error) {
      return renderError();
    }
    return renderLoading();
  };

  const renderLoading = () => {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.policyDetails.loadingPolicyDescription"
          defaultMessage="Loading policy…"
        />
      </SectionLoading>
    );
  };

  const renderError = () => {
    const notFound = (error as any).status === 404;
    const errorObject = notFound
      ? {
          data: {
            error: i18n.translate(
              'xpack.snapshotRestore.policyDetails.policyNotFoundErrorMessage',
              {
                defaultMessage: `The policy '{name}' does not exist.`,
                values: {
                  name: policyName,
                },
              }
            ),
          },
        }
      : error;
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.policyDetails.loadingPolicyErrorTitle"
            defaultMessage="Error loading policy"
          />
        }
        error={errorObject as Error}
      />
    );
  };

  const renderFooter = () => {
    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            flush="left"
            onClick={onClose}
            data-test-subj="srPolicyDetailsFlyoutCloseButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        {policyDetails ? (
          <EuiFlexItem grow={false}>
            <PolicyExecuteProvider>
              {(executePolicyPrompt) => {
                return (
                  <PolicyDeleteProvider>
                    {(deletePolicyPrompt) => {
                      return (
                        <EuiPopover
                          id="policyActionMenu"
                          button={
                            <EuiButton
                              data-test-subj="policyActionMenuButton"
                              iconSide="right"
                              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                              iconType="arrowDown"
                              fill
                            >
                              <FormattedMessage
                                id="xpack.snapshotRestore.policyDetails.manageButtonLabel"
                                defaultMessage="Manage policy"
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
                            data-test-subj="policyActionContextMenu"
                            initialPanelId={0}
                            panels={[
                              {
                                id: 0,
                                title: i18n.translate(
                                  'xpack.snapshotRestore.policyDetails.managePanelTitle',
                                  {
                                    defaultMessage: 'Policy options',
                                  }
                                ),
                                items: [
                                  {
                                    name: i18n.translate(
                                      'xpack.snapshotRestore.policyDetails.executeButtonLabel',
                                      {
                                        defaultMessage: 'Run now',
                                      }
                                    ),
                                    icon: 'play',
                                    onClick: () => {
                                      executePolicyPrompt(policyName, () =>
                                        // Wait a little bit for policy to execute before reloading policy table
                                        // and policy details so that History tab information is updated with
                                        // results of the execution
                                        setTimeout(() => {
                                          onPolicyExecuted();
                                          reload();
                                        }, 2000)
                                      );
                                    },
                                    disabled: Boolean(policyDetails.policy.inProgress),
                                  },
                                  {
                                    name: i18n.translate(
                                      'xpack.snapshotRestore.policyDetails.editButtonLabel',
                                      {
                                        defaultMessage: 'Edit',
                                      }
                                    ),
                                    icon: 'pencil',
                                    ...reactRouterNavigate(history, linkToEditPolicy(policyName)),
                                  },
                                  {
                                    name: i18n.translate(
                                      'xpack.snapshotRestore.policyDetails.deleteButtonLabel',
                                      {
                                        defaultMessage: 'Delete',
                                      }
                                    ),
                                    icon: 'trash',
                                    disabled: policyDetails.policy.isManagedPolicy,
                                    onClick: () =>
                                      deletePolicyPrompt([policyName], onPolicyDeleted),
                                  },
                                ],
                              },
                            ]}
                          />
                        </EuiPopover>
                      );
                    }}
                  </PolicyDeleteProvider>
                );
              }}
            </PolicyExecuteProvider>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  };

  return (
    <EuiFlyout
      onClose={onClose}
      data-test-subj="policyDetail"
      aria-labelledby="srPolicyDetailsFlyoutTitle"
      size="m"
      maxWidth={550}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="srPolicyDetailsFlyoutTitle" data-test-subj="title">
            {policyName}{' '}
            <EuiButtonIcon
              iconType="refresh"
              color="text"
              aria-label={i18n.translate(
                'xpack.snapshotRestore.policyDetails.reloadButtonAriaLabel',
                { defaultMessage: 'Reload' }
              )}
              onClick={() => reload()}
            />
          </h2>
        </EuiTitle>
        {policyDetails && policyDetails.policy && policyDetails.policy.inProgress ? (
          <>
            <EuiSpacer size="s" />
            <InlineLoading size="s">
              <EuiLink
                {...reactRouterNavigate(
                  history,
                  linkToSnapshot(
                    policyDetails.policy.repository,
                    policyDetails.policy.inProgress.snapshotName
                  )
                )}
                data-test-subj="inProgressSnapshotLink"
              >
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.inProgressSnapshotLinkText"
                  defaultMessage="'{snapshotName}' in progress"
                  values={{ snapshotName: policyDetails.policy.inProgress.snapshotName }}
                />
              </EuiLink>
            </InlineLoading>
          </>
        ) : null}
        {renderTabs()}
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="content">{renderBody()}</EuiFlyoutBody>

      <EuiFlyoutFooter>{renderFooter()}</EuiFlyoutFooter>
    </EuiFlyout>
  );
};
