/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

// import { useLocation } from 'react-router-dom';

import { css } from '@emotion/react';
// import { useValues } from 'kea';

import {
  EuiButton,
  EuiButtonIcon,
  EuiCard,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
  EuiProgress,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n-react';

import connectorLogo from './assets/connector-logo.svg';

interface FinishUpStepProps {
  setSyncing: Function;
  syncing: boolean;
  title: string;
}

export const FinishUpStep: React.FC<FinishUpStepProps> = ({ title, syncing, setSyncing }) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setPopover] = useState(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });
  const [hasData, setHasData] = useState(false);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const items = [
    <EuiContextMenuItem key="copy" icon="indexEdit" onClick={closePopover}>
      {i18n.translate(
        'xpack.enterpriseSearch.createConnector.finishUpStep.manageAttachedIndexContextMenuItemLabel',
        { defaultMessage: 'Manage attached index' }
      )}
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="edit" icon="refresh" onClick={closePopover}>
      {i18n.translate(
        'xpack.enterpriseSearch.createConnector.finishUpStep.incrementalContentSyncContextMenuItemLabel',
        { defaultMessage: 'Incremental content sync' }
      )}
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="share" icon="clockCounter" onClick={closePopover}>
      {i18n.translate(
        'xpack.enterpriseSearch.createConnector.finishUpStep.scheduleASyncContextMenuItemLabel',
        {
          defaultMessage: 'Schedule a sync',
        }
      )}
    </EuiContextMenuItem>,
  ];

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({
        behavior: 'smooth',
        top: 0,
      });
    }, 100);
  }, []);
  return (
    <>
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="m">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="xl" />
            {syncing && (
              <>
                <EuiFlexGroup gutterSize="m">
                  <EuiFlexItem>
                    <EuiText size="xs">
                      {i18n.translate(
                        'xpack.enterpriseSearch.createConnector.finishUpStep.syncingDataTextLabel',
                        {
                          defaultMessage: 'Syncing data',
                        }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText textAlign="right" size="xs">
                      {i18n.translate(
                        'xpack.enterpriseSearch.createConnector.finishUpStep.DocumentsTextLabel',
                        {
                          defaultMessage: '4 Documents',
                        }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiProgress
                  size="s"
                  color="success"
                  onClick={() => {
                    setHasData(true);
                    setSyncing(false);
                  }}
                />
                <EuiSpacer size="xl" />
              </>
            )}
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="m">
                <EuiFlexItem>
                  <EuiCard
                    icon={<EuiIcon size="xxl" type="machineLearningApp" />}
                    titleSize="s"
                    title={i18n.translate(
                      'xpack.enterpriseSearch.createConnector.finishUpStep.euiCard.chatWithYourDataLabel',
                      { defaultMessage: 'Chat with your data' }
                    )}
                    description={i18n.translate(
                      'xpack.enterpriseSearch.createConnector.finishUpStep.euiCard.chatWithYourDataDescriptionl',
                      {
                        defaultMessage:
                          'Combine your data with the power of LLMs for retrieval augmented generation (RAG)',
                      }
                    )}
                    footer={
                      hasData ? (
                        <EuiButton
                          data-test-subj="enterpriseSearchFinishUpStepStartSearchPlaygroundButton"
                          aria-label={i18n.translate(
                            'xpack.enterpriseSearch.createConnector.finishUpStep.euiButton.startSearchPlaygroundLabel',
                            { defaultMessage: 'Start Search Playground' }
                          )}
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.createConnector.finishUpStep.startSearchPlaygroundButtonLabel',
                            { defaultMessage: 'Start Search Playground' }
                          )}
                        </EuiButton>
                      ) : (
                        <EuiButton
                          data-test-subj="enterpriseSearchFinishUpStepButton"
                          color="warning"
                          iconSide="left"
                          iconType="refresh"
                          isLoading={syncing}
                          aria-label={i18n.translate(
                            'xpack.enterpriseSearch.createConnector.finishUpStep.euiButton.firstSyncDataLabel',
                            { defaultMessage: 'First sync data' }
                          )}
                          onClick={() => {
                            setSyncing(true);
                          }}
                        >
                          {syncing ? 'Syncing data' : 'First sync data'}
                        </EuiButton>
                      )
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiCard
                    icon={<EuiIcon size="xxl" type="discoverApp" />}
                    titleSize="s"
                    title={i18n.translate(
                      'xpack.enterpriseSearch.createConnector.finishUpStep.euiCard.exploreYourDataLabel',
                      { defaultMessage: 'Explore your data' }
                    )}
                    description={i18n.translate(
                      'xpack.enterpriseSearch.createConnector.finishUpStep.euiCard.exploreYourDataDescription',
                      {
                        defaultMessage:
                          'See your connector documents or make a data view to explore it',
                      }
                    )}
                    footer={
                      hasData ? (
                        <EuiButton
                          data-test-subj="enterpriseSearchFinishUpStepViewInDiscoverButton"
                          aria-label={i18n.translate(
                            'xpack.enterpriseSearch.finishUpStep.euiButton.viewInDiscoverLabel',
                            { defaultMessage: 'View in Discover' }
                          )}
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.createConnector.finishUpStep.viewInDiscoverButtonLabel',
                            { defaultMessage: 'View in Discover' }
                          )}
                        </EuiButton>
                      ) : (
                        <EuiButton
                          data-test-subj="enterpriseSearchFinishUpStepButton"
                          color="warning"
                          iconSide="left"
                          iconType="refresh"
                          isLoading={syncing}
                          aria-label={i18n.translate(
                            'xpack.enterpriseSearch.createConnector.finishUpStep.euiButton.firstSyncDataLabel',
                            { defaultMessage: 'First sync data' }
                          )}
                          onClick={() => {
                            setSyncing(true);
                          }}
                        >
                          {syncing ? 'Syncing data' : 'First sync data'}
                        </EuiButton>
                      )
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiCard
                    icon={<EuiIcon size="xxl" type={connectorLogo} />}
                    titleSize="s"
                    title={i18n.translate(
                      'xpack.enterpriseSearch.createConnector.finishUpStep.euiCard.manageYourConnectorLabel',
                      { defaultMessage: 'Manage your connector' }
                    )}
                    description={i18n.translate(
                      'xpack.enterpriseSearch.createConnector.finishUpStep.euiCard.manageYourConnectorDescription',
                      {
                        defaultMessage:
                          'Now you can manage your connector, schedule a sync and much more',
                      }
                    )}
                    footer={
                      <EuiFlexGroup responsive={false} gutterSize="xs" justifyContent="center">
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            data-test-subj="enterpriseSearchFinishUpStepManageConnectorButton"
                            size="m"
                            fill
                          >
                            {i18n.translate(
                              'xpack.enterpriseSearch.createConnector.finishUpStep.manageConnectorButtonLabel',
                              { defaultMessage: 'Manage connector' }
                            )}
                          </EuiButton>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiPopover
                            id={splitButtonPopoverId}
                            button={
                              <EuiButtonIcon
                                data-test-subj="enterpriseSearchFinishUpStepButton"
                                display="fill"
                                size="m"
                                iconType="boxesVertical"
                                aria-label={i18n.translate(
                                  'xpack.enterpriseSearch.createConnector.finishUpStep.euiButtonIcon.moreLabel',
                                  { defaultMessage: 'More' }
                                )}
                                onClick={onButtonClick}
                              />
                            }
                            isOpen={isPopoverOpen}
                            closePopover={closePopover}
                            panelPaddingSize="none"
                            anchorPosition="downLeft"
                          >
                            <EuiContextMenuPanel
                              title={i18n.translate(
                                'xpack.enterpriseSearch.createConnector.finishUpStep.euiContextMenuPanel.manageConnectorLabel',
                                { defaultMessage: 'Manage connector' }
                              )}
                              size="s"
                              items={items}
                            />
                          </EuiPopover>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    }
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiHorizontalRule margin="xl" />
            <EuiTitle size="s">
              <h3>
                {i18n.translate(
                  'xpack.enterpriseSearch.createConnector.finishUpStep.h3.queryYourDataLabel',
                  {
                    defaultMessage: 'Query your data',
                  }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="l" />
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem>
                <EuiCard
                  layout="horizontal"
                  icon={
                    <EuiIcon
                      css={() => css`
                        margin-top: ${euiTheme.size.xs};
                      `}
                      size="m"
                      type="visVega"
                    />
                  }
                  title={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.finishUpStep.euiCard.queryWithLanguageClientsLabel',
                    { defaultMessage: 'Query with language clients' }
                  )}
                  titleSize="xs"
                  description={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.finishUpStep.euiCard.queryWithLanguageClientsLDescription',
                    {
                      defaultMessage:
                        'Use your favourite language client to query your data in your app',
                    }
                  )}
                  onClick={() => {}}
                  display="subdued"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCard
                  layout="horizontal"
                  icon={
                    <EuiIcon
                      css={() => css`
                        margin-top: ${euiTheme.size.xs};
                      `}
                      size="m"
                      type="console"
                    />
                  }
                  title={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.finishUpStep.euiCard.devToolsLabel',
                    { defaultMessage: 'Dev tools' }
                  )}
                  titleSize="xs"
                  description={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.finishUpStep.euiCard.devToolsDescription',
                    {
                      defaultMessage:
                        'Tools for interacting with your data, such a console, profiler, Grok debugger and more',
                    }
                  )}
                  onClick={() => {}}
                  display="subdued"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
