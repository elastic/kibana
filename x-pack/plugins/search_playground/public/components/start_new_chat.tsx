/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { AnalyticsEvents } from '../analytics/constants';
import { useLoadConnectors } from '../hooks/use_load_connectors';
import { useUsageTracker } from '../hooks/use_usage_tracker';
import { ChatFormFields } from '../types';
import { SetUpConnectorPanelForStartChat } from './set_up_connector_panel_for_start_chat';
import { SourcesPanelForStartChat } from './sources_panel/sources_panel_for_start_chat';

const maxWidthPage = 640;

interface StartNewChatProps {
  onStartClick: () => void;
}

export const StartNewChat: React.FC<StartNewChatProps> = ({ onStartClick }) => {
  const { euiTheme } = useEuiTheme();
  const { data: connectors } = useLoadConnectors();
  const { watch } = useFormContext();
  const usageTracker = useUsageTracker();

  useEffect(() => {
    usageTracker?.load(AnalyticsEvents.startNewChatPageLoaded);
  }, [usageTracker]);

  return (
    <EuiFlexGroup justifyContent="center" className="eui-yScroll">
      <EuiFlexGroup
        css={{
          height: 'fit-content',
          padding: `${euiTheme.size.xxl} ${euiTheme.size.l}`,
          maxWidth: maxWidthPage,
          boxSizing: 'content-box',
        }}
        direction="column"
        gutterSize="xl"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="m">
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.searchPlayground.startNewChat.title"
                  defaultMessage="Start a new chat"
                />
              </h2>
            </EuiTitle>

            <EuiIcon type="discuss" size="xl" />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.searchPlayground.startNewChat.description"
                defaultMessage="Combine your Elasticsearch data with the power of large language models for retrieval augmented generation (RAG). Use the UI to view and edit the Elasticsearch queries used to search your data, then download the code to integrate into your own application."
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SetUpConnectorPanelForStartChat />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SourcesPanelForStartChat />
        </EuiFlexItem>

        <EuiFlexGroup justifyContent="flexEnd" data-test-subj="startChatButton">
          <EuiButton
            fill
            iconType="arrowRight"
            iconSide="right"
            disabled={
              !watch(ChatFormFields.indices, []).length ||
              !Object.keys(connectors || {}).length ||
              !watch(ChatFormFields.elasticsearchQuery, '')
            }
            onClick={onStartClick}
          >
            <FormattedMessage
              id="xpack.searchPlayground.startNewChat.startBtn"
              defaultMessage="Start"
            />
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
