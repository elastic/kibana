/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

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

interface FinishUpStepProps {
  title: string;
}

export const FinishUpStep: React.FC<FinishUpStepProps> = ({ title }) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setPopover] = useState(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });
  const [hasData, setHasData] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const items = [
    <EuiContextMenuItem key="copy" icon="indexEdit" onClick={closePopover}>
      Manage attached index
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="edit" icon="refresh" onClick={closePopover}>
      Incremental content sync
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="share" icon="clockCounter" onClick={closePopover}>
      Schedule a sync
    </EuiContextMenuItem>,
  ];
  return (
    <>
      <EuiFlexGroup gutterSize="m" direction="column">
        {/* Configuration */}
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
                    <EuiText size="xs">Syncing</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText textAlign="right" size="xs">
                      4 Documents
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiProgress
                  size="s"
                  color="primary"
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
                    title="Chat with your data"
                    description="Combine your data with the power of LLMs for retrieval augmented generation (RAG)."
                    footer={
                      hasData ? (
                        <EuiButton aria-label="Start Search Playground">
                          Start Search Playground
                        </EuiButton>
                      ) : (
                        <EuiButton
                          color="warning"
                          iconSide="left"
                          iconType="refresh"
                          aria-label="First sync data"
                          onClick={() => {
                            setSyncing(true);
                          }}
                        >
                          First sync data
                        </EuiButton>
                      )
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiCard
                    icon={<EuiIcon size="xxl" type="discoverApp" />}
                    titleSize="s"
                    title="Explore your data"
                    description="See your connector documents or make a data view to explore it."
                    footer={
                      hasData ? (
                        <EuiButton aria-label="View in Discover">View in Discover</EuiButton>
                      ) : (
                        <EuiButton
                          color="warning"
                          iconSide="left"
                          iconType="refresh"
                          aria-label="First sync data"
                          onClick={() => {
                            setSyncing(true);
                          }}
                        >
                          First sync data
                        </EuiButton>
                      )
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiCard
                    icon={<EuiIcon size="xxl" type="machineLearningApp" />}
                    titleSize="s"
                    title="Manage your connector"
                    description="Now you can manage your connector, schedule a sync and much more"
                    footer={
                      <EuiFlexGroup responsive={false} gutterSize="xs" justifyContent="center">
                        <EuiFlexItem grow={false}>
                          <EuiButton size="m" fill>
                            Manage connector
                          </EuiButton>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiPopover
                            id={splitButtonPopoverId}
                            button={
                              <EuiButtonIcon
                                display="fill"
                                size="m"
                                iconType="boxesVertical"
                                aria-label="More"
                                onClick={onButtonClick}
                              />
                            }
                            isOpen={isPopoverOpen}
                            closePopover={closePopover}
                            panelPaddingSize="none"
                            anchorPosition="downLeft"
                          >
                            <EuiContextMenuPanel title="Manage connector" size="s" items={items} />
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
              <h3>Query your data</h3>
            </EuiTitle>
            <EuiSpacer size="l" />
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem>
                <EuiCard
                  layout="horizontal"
                  icon={
                    <EuiIcon
                      css={({ euiTheme }) => css`
                        margin-top: ${euiTheme.size.xs};
                      `}
                      size="m"
                      type="visVega"
                    />
                  }
                  title="Query with language clients"
                  titleSize="xs"
                  description="Use your favourite language client to query your data in your app."
                  onClick={() => {}}
                  display="subdued"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCard
                  layout="horizontal"
                  icon={
                    <EuiIcon
                      css={({ euiTheme }) => css`
                        margin-top: ${euiTheme.size.xs};
                      `}
                      size="m"
                      type="console"
                    />
                  }
                  title="Dev tools"
                  titleSize="xs"
                  description="Tools for interacting with your data, such a console, profiler, Grok debugger and more.."
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
