/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
  EuiSpacer,
  EuiIcon,
  EuiText,
  EuiTitle,
  EuiLink,
  EuiLoadingElastic,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useNavigation } from '../../../hooks/use_navigation';
import { useBreadcrumb } from '../../../hooks/use_breadcrumbs';
import { useKibana } from '../../../hooks/use_kibana';
import { appPaths } from '../../../app_paths';
import { assistantLabels } from '../i18n';
import { i18n } from '@kbn/i18n';
import { useAgent } from '../../../hooks/use_agent';
import { useConversationList } from '../../../hooks/use_conversation_list';
import { sortAndGroupConversations } from '../../../utils/sort_and_group_conversations';
import { sliceRecentConversations } from '../../../utils/slice_recent_conversations';
import { useAgentEdition } from '../../../hooks/use_agent_edition';
import { EditAssistantBasicInfo } from './assistant_edit_basic_info_modal';
import { EditPrompt } from './assistant_edit_prompt_modal';
import { AssistantAvatar } from '../assistant_avatar';

interface AssistantDetailsProps {
  agentId: string;
}

export const AssistantDetails: React.FC<AssistantDetailsProps> = ({ agentId }) => {
  const { navigateToWorkchatUrl, createWorkchatUrl } = useNavigation();
  const {
    services: { notifications },
  } = useKibana();
  const { agent: assistant, isLoading } = useAgent({ agentId });
  const { conversations } = useConversationList({ agentId });

  // State for modals
  const [isBasicInfoModalVisible, setIsBasicInfoModalVisible] = useState(false);
  const [isPromptModalVisible, setIsPromptModalVisible] = useState(false);

  const conversationGroups = useMemo(() => {
    return sortAndGroupConversations(sliceRecentConversations(conversations, 10));
  }, [conversations]);

  const breadcrumb = useMemo(() => {
    return [
      {
        text: assistantLabels.breadcrumb.assistantsPill,
        href: createWorkchatUrl(appPaths.assistants.list),
      },
      { text: assistantLabels.breadcrumb.assistantDetailsPill },
    ];
  }, [createWorkchatUrl]);

  useBreadcrumb(breadcrumb);

  // Using the agent edition hook
  const { editState, setFieldValue, submit, isSubmitting } = useAgentEdition({
    agentId,
    onSaveSuccess: (agent) => {
      notifications.toasts.addSuccess(
        i18n.translate('workchatApp.assistants.editSuccessMessage', {
          defaultMessage: 'Assistant updated successfully',
        })
      );
      // Close both modals when save is successful
      setIsBasicInfoModalVisible(false);
      setIsPromptModalVisible(false);
    },
  });

  // Handlers for modals
  const handleOpenBasicInfoModal = useCallback(() => {
    setIsBasicInfoModalVisible(true);
  }, []);

  const handleCloseBasicInfoModal = useCallback(() => {
    setIsBasicInfoModalVisible(false);
  }, []);

  const handleOpenPromptModal = useCallback(() => {
    setIsPromptModalVisible(true);
  }, []);

  const handleClosePromptModal = useCallback(() => {
    setIsPromptModalVisible(false);
  }, []);

  if (isLoading || !assistant) {
    return (
      <KibanaPageTemplate.EmptyPrompt>
        <EuiLoadingElastic />
      </KibanaPageTemplate.EmptyPrompt>
    );
  }
  console.log(assistant);

  const AssistantBasicInfo = () => (
    <EuiPanel hasShadow={false} hasBorder={true}>
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" direction="row" gutterSize="xl">
            <EuiFlexItem grow={false}>
              <AssistantAvatar
                size="xl"
                name={assistant.name}
                customText={assistant.avatar?.text}
                color={assistant.avatar?.color}
              />
            </EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiTitle size="s">
                  <span>{assistant.name}</span>
                </EuiTitle>
              </EuiFlexItem>
              <EuiText size="s" color="subdued">
                {assistant.description}
              </EuiText>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="pencil"
            color="text"
            onClick={handleOpenBasicInfoModal}
            data-test-subj="editAssistantBasicInfoButton"
          >
            {assistantLabels.editView.editButtonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  const AssistantPrompt = () => (
    <EuiPanel hasShadow={false} hasBorder={true}>
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiText size="m" color="subdued">
            {assistant?.configuration?.systemPrompt}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="pencil"
            color="text"
            onClick={handleOpenPromptModal}
            data-test-subj="editAssistantPromptButton"
          >
            {assistantLabels.editView.editButtonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  const AssistantChatHistory = () => (
    <EuiPanel hasShadow={false} hasBorder={true}>
      <EuiFlexGroup direction="column" gutterSize="l">
        {conversationGroups.map(({ conversations: groupConversations, dateLabel }) => (
          <EuiFlexItem key={dateLabel}>
            <EuiPanel hasBorder={false} hasShadow={false} color="transparent" paddingSize="s">
              <EuiText size="s">
                <h4>{dateLabel}</h4>
              </EuiText>
            </EuiPanel>
            <EuiSpacer size="s" />
            <EuiFlexGroup direction="column" gutterSize="m">
              {groupConversations.map((conversation) => (
                <EuiFlexItem key={conversation.id}>
                  <EuiLink
                    color="subdued"
                    onClick={() => {
                      navigateToWorkchatUrl(
                        appPaths.chat.conversation({
                          agentId: assistant.id,
                          conversationId: conversation.id,
                        })
                      );
                    }}
                  >
                    {conversation.title}
                  </EuiLink>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );

  return (
    <>
      <KibanaPageTemplate.Section paddingSize="m">
        <EuiSpacer size="l" />

        <EuiFlexGroup gutterSize="xl" alignItems="flexStart" direction="row">
          <EuiFlexItem grow={2}>
            <EuiFlexGroup gutterSize="l" direction="column">
              <EuiFlexItem>
                <EuiFlexGroup alignItems="center" gutterSize="xs">
                  <EuiIcon type="user" size="m" />
                  <EuiTitle size="xxs">
                    <h4>
                      {i18n.translate('workchatApp.assistants.basicInfoTitle', {
                        defaultMessage: 'Basic',
                      })}
                    </h4>
                  </EuiTitle>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <AssistantBasicInfo />
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiFlexGroup alignItems="center" gutterSize="xs">
                  <EuiIcon type="gear" size="m" />
                  <EuiTitle size="xxs">
                    <h4>
                      {i18n.translate('workchatApp.assistants.promptTitle', {
                        defaultMessage: 'Prompt',
                      })}
                    </h4>
                  </EuiTitle>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <AssistantPrompt />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={1}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiIcon type="list" size="m" />
              <EuiTitle size="xxs">
                <h4>
                  {i18n.translate('workchatApp.home.recentConversations.title', {
                    defaultMessage: 'Recent conversations',
                  })}
                </h4>
              </EuiTitle>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <AssistantChatHistory />
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>

      {/* Modals */}
      {isBasicInfoModalVisible && (
        <EditAssistantBasicInfo
          onCancel={handleCloseBasicInfoModal}
          editState={editState}
          setFieldValue={setFieldValue}
          submit={submit}
          isSubmitting={isSubmitting}
        />
      )}

      {isPromptModalVisible && (
        <EditPrompt
          onCancel={handleClosePromptModal}
          editState={editState}
          setFieldValue={setFieldValue}
          submit={submit}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
};
