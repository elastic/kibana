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
import React, { useEffect, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { useUsageTracker } from '../hooks/use_usage_tracker';
import { useLoadConnectors } from '../hooks/use_load_connectors';
import { SourcesPanelForStartChat } from './sources_panel/sources_panel_for_start_chat';
import { SetUpConnectorPanelForStartChat } from './set_up_connector_panel_for_start_chat';
import { ChatFormFields } from '../types';
import { AnalyticsEvents } from '../analytics/constants';
import { useSourceIndicesFields } from '../hooks/use_source_indices_field';

const maxWidthPage = 640;

interface StartNewChatProps {
  onStartClick: () => void;
}

export const StartNewChat: React.FC<StartNewChatProps> = ({ onStartClick }) => {
  const { euiTheme } = useEuiTheme();
  const { data: connectors } = useLoadConnectors();
  const { watch } = useFormContext();
  const usageTracker = useUsageTracker();

  const [searchParams] = useSearchParams();
  const index = useMemo(() => searchParams.get('default-index'), [searchParams]);
  const { addIndex } = useSourceIndicesFields();

  useEffect(() => {
    if (index) {
      addIndex(index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    usageTracker?.load(AnalyticsEvents.startNewChatPageLoaded);
  }, [usageTracker]);

  return (
    <EuiFlexGroup justifyContent="center" className="eui-yScroll" data-test-subj="startChatPage">
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
              <h2 data-test-subj="startNewChatTitle">
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

        <EuiFlexGroup justifyContent="flexEnd">
          <EuiButton
            fill
            iconType="arrowRight"
            iconSide="right"
            data-test-subj="startChatButton"
            disabled={
              !watch(ChatFormFields.indices, [])?.length ||
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
