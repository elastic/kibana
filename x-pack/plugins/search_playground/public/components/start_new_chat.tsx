/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { SourcesPanelForStartChat } from './sources_panel/sources_panel_for_start_chat';
import { SummarizationPanelForStartChat } from './summarization_panel/summarization_panel_for_start_chat';
import { ChatFormFields } from '../types';

const maxWidthPage = 640;

interface StartNewChatProps {
  onStartClick: () => void;
}

export const StartNewChat: React.FC<StartNewChatProps> = ({ onStartClick }) => {
  const { euiTheme } = useEuiTheme();
  const { watch } = useFormContext();

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
          <SummarizationPanelForStartChat />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SourcesPanelForStartChat />
        </EuiFlexItem>

        <EuiFlexGroup justifyContent="flexEnd">
          <EuiButton
            fill
            iconType="arrowRight"
            iconSide="right"
            disabled={!watch(ChatFormFields.openAIKey) || !watch(ChatFormFields.indices, []).length}
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
