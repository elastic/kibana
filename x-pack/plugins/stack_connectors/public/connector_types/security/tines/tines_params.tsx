/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import {
  JsonEditorWithMessageVariables,
  useSubAction,
  useKibana,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SUB_ACTION } from '../../../../common/connector_types/security/tines/constants';
import type {
  TinesStoryObject,
  TinesWebhookObject,
  TinesWebhooksActionParams,
  TinesStoriesActionResponse,
  TinesWebhooksActionResponse,
  TinesStoriesActionParams,
} from '../../../../common/connector_types/security/tines/types';
import type { TinesExecuteActionParams, TinesExecuteSubActionParams } from './types';
import * as i18n from './translations';

type StoryOption = EuiComboBoxOptionOption<TinesStoryObject>;
type WebhookOption = EuiComboBoxOptionOption<TinesWebhookObject>;

const createStoryOption = (story: TinesStoryObject): StoryOption => ({
  key: story.id.toString(),
  value: story,
  label: story.published ? story.name : `${story.name} (${i18n.STORY_DRAFT_TEXT})`,
});

const createWebhookOption = (webhook: TinesWebhookObject): WebhookOption => ({
  key: webhook.id.toString(),
  value: webhook,
  label: webhook.name,
});

const TinesParamsFields: React.FunctionComponent<ActionParamsProps<TinesExecuteActionParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const { toasts } = useKibana().notifications;
  const { subAction, subActionParams } = actionParams;
  const { body, webhook, webhookUrl } = subActionParams ?? {};

  const [connectorId, setConnectorId] = useState<string | undefined>(actionConnector?.id);
  const [selectedStoryOption, setSelectedStoryOption] = useState<StoryOption | null | undefined>();
  const [selectedWebhookOption, setSelectedWebhookOption] = useState<
    WebhookOption | null | undefined
  >();

  const isTesting = useMemo(() => !messageVariables?.length, [messageVariables]);

  useEffect(() => {
    if (!subAction) {
      editAction('subAction', isTesting ? SUB_ACTION.TEST : SUB_ACTION.RUN, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTesting, subAction]);

  const editSubActionParams = useCallback(
    (params: TinesExecuteSubActionParams) => {
      editAction('subActionParams', { ...subActionParams, ...params }, index);
    },
    [editAction, index, subActionParams]
  );

  const {
    response: { stories, incompleteResponse: incompleteStories } = {},
    isLoading: isLoadingStories,
    error: storiesError,
  } = useSubAction<TinesStoriesActionParams, TinesStoriesActionResponse>({
    connectorId,
    subAction: 'stories',
  });

  const {
    response: { webhooks, incompleteResponse: incompleteWebhooks } = {},
    isLoading: isLoadingWebhooks,
    error: webhooksError,
  } = useSubAction<TinesWebhooksActionParams, TinesWebhooksActionResponse>({
    connectorId,
    subAction: 'webhooks',
    ...(selectedStoryOption?.value?.id
      ? { subActionParams: { storyId: selectedStoryOption?.value?.id } }
      : { disabled: true }),
  });

  useEffect(() => {
    if (connectorId !== actionConnector?.id) {
      // Selected story reset needed before requesting webhooks with a different connectorId
      setSelectedStoryOption(null);
      setConnectorId(actionConnector?.id);
    }
  }, [actionConnector?.id, connectorId]);

  const storiesOptions = useMemo(() => stories?.map(createStoryOption) ?? [], [stories]);
  const webhooksOptions = useMemo(() => webhooks?.map(createWebhookOption) ?? [], [webhooks]);

  useEffect(() => {
    if (storiesError) {
      toasts.danger({ title: i18n.STORIES_ERROR, body: storiesError.message });
    }
    if (webhooksError) {
      toasts.danger({ title: i18n.WEBHOOKS_ERROR, body: webhooksError.message });
    }
  }, [toasts, storiesError, webhooksError]);

  const showFallbackFrom = useMemo<'Story' | 'Webhook' | 'any' | null>(() => {
    if (incompleteStories && !selectedStoryOption) {
      return 'Story';
    }
    if (incompleteWebhooks && !selectedWebhookOption) {
      return 'Webhook';
    }
    if (webhookUrl) {
      return 'any'; // no incompleteResponse but webhookUrl is stored in the connector
    }
    return null;
  }, [
    webhookUrl,
    incompleteStories,
    incompleteWebhooks,
    selectedStoryOption,
    selectedWebhookOption,
  ]);

  useEffect(() => {
    if (selectedStoryOption === undefined && webhook?.storyId && stories) {
      // Set the initial selected story option from saved storyId when stories are loaded
      const selectedStory = stories.find(({ id }) => id === webhook.storyId);
      if (selectedStory) {
        setSelectedStoryOption(createStoryOption(selectedStory));
      } else {
        toasts.warning({ title: i18n.STORY_NOT_FOUND_WARNING });
        editSubActionParams({ webhook: undefined });
      }
    }

    if (selectedStoryOption !== undefined && selectedStoryOption?.value?.id !== webhook?.storyId) {
      // Selected story changed, update storyId param and reset selected webhook
      editSubActionParams({ webhook: { storyId: selectedStoryOption?.value?.id } });
      setSelectedWebhookOption(null);
    }
  }, [selectedStoryOption, webhook?.storyId, stories, toasts, editSubActionParams]);

  useEffect(() => {
    if (selectedWebhookOption === undefined && webhook?.id && webhooks) {
      // Set the initial selected webhook option from saved webhookId when webhooks are loaded
      const selectedWebhook = webhooks.find(({ id }) => id === webhook.id);
      if (selectedWebhook) {
        setSelectedWebhookOption(createWebhookOption(selectedWebhook));
      } else {
        toasts.warning({ title: i18n.WEBHOOK_NOT_FOUND_WARNING });
        editSubActionParams({ webhook: { storyId: webhook?.storyId } });
      }
    }

    if (selectedWebhookOption !== undefined && selectedWebhookOption?.value?.id !== webhook?.id) {
      // Selected webhook changed, update webhook param, preserve storyId if the selected webhook has been reset
      editSubActionParams({
        webhook: selectedWebhookOption
          ? selectedWebhookOption.value
          : { storyId: webhook?.storyId },
      });
    }
  }, [selectedWebhookOption, webhook, webhooks, toasts, editSubActionParams]);

  const selectedStoryOptions = useMemo(
    () => (selectedStoryOption ? [selectedStoryOption] : []),
    [selectedStoryOption]
  );
  const selectedWebhookOptions = useMemo(
    () => (selectedWebhookOption ? [selectedWebhookOption] : []),
    [selectedWebhookOption]
  );

  const onChangeStory = useCallback(([selected]: StoryOption[]) => {
    setSelectedStoryOption(selected ?? null);
  }, []);
  const onChangeWebhook = useCallback(([selected]: WebhookOption[]) => {
    setSelectedWebhookOption(selected ?? null);
  }, []);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFormRow
          fullWidth
          error={errors.story}
          isInvalid={!!errors.story?.length}
          label={i18n.STORY_LABEL}
          helpText={i18n.STORY_HELP}
        >
          <EuiComboBox
            aria-label={i18n.STORY_PLACEHOLDER}
            placeholder={
              webhookUrl ? i18n.DISABLED_BY_WEBHOOK_URL_PLACEHOLDER : i18n.STORY_ARIA_LABEL
            }
            singleSelection={{ asPlainText: true }}
            options={storiesOptions}
            selectedOptions={selectedStoryOptions}
            onChange={onChangeStory}
            isDisabled={isLoadingStories || !!webhookUrl}
            isLoading={isLoadingStories}
            fullWidth
            data-test-subj="tines-storySelector"
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          error={errors.webhook}
          isInvalid={!!errors.webhook?.length}
          label={i18n.WEBHOOK_LABEL}
          helpText={i18n.WEBHOOK_HELP}
        >
          <EuiComboBox
            aria-label={i18n.WEBHOOK_ARIA_LABEL}
            placeholder={
              webhookUrl
                ? i18n.DISABLED_BY_WEBHOOK_URL_PLACEHOLDER
                : selectedStoryOption
                ? i18n.WEBHOOK_PLACEHOLDER
                : i18n.WEBHOOK_DISABLED_PLACEHOLDER
            }
            singleSelection={{ asPlainText: true }}
            options={webhooksOptions}
            selectedOptions={selectedWebhookOptions}
            onChange={onChangeWebhook}
            isDisabled={!selectedStoryOption || isLoadingWebhooks || !!webhookUrl}
            isLoading={isLoadingWebhooks}
            fullWidth
            data-test-subj="tines-webhookSelector"
          />
        </EuiFormRow>
      </EuiFlexItem>

      {showFallbackFrom != null && (
        <EuiFlexItem>
          {showFallbackFrom !== 'any' && (
            <>
              <EuiCallOut title={i18n.WEBHOOK_URL_FALLBACK_TITLE} color="primary">
                {i18n.WEBHOOK_URL_FALLBACK_TEXT(showFallbackFrom)}
              </EuiCallOut>
              <EuiSpacer size="s" />
            </>
          )}
          <EuiFormRow
            fullWidth
            error={errors.webhookUrl}
            isInvalid={!!errors.webhookUrl?.length}
            label={i18n.WEBHOOK_URL_LABEL}
            helpText={i18n.WEBHOOK_URL_HELP}
          >
            <EuiFieldText
              placeholder={i18n.WEBHOOK_URL_PLACEHOLDER}
              value={webhookUrl}
              onChange={(ev) => {
                editSubActionParams({ webhookUrl: ev.target.value });
              }}
              fullWidth
              data-test-subj="tines-webhookUrlInput"
            />
          </EuiFormRow>
        </EuiFlexItem>
      )}
      {isTesting && (
        <EuiFlexItem>
          <JsonEditorWithMessageVariables
            paramsProperty={'body'}
            inputTargetValue={body}
            label={i18n.BODY_LABEL}
            aria-label={i18n.BODY_ARIA_LABEL}
            errors={errors.body as string[]}
            onDocumentsChange={(json: string) => {
              editSubActionParams({ body: json });
            }}
            onBlur={() => {
              if (!body) {
                editSubActionParams({ body: '' });
              }
            }}
            data-test-subj="tines-bodyJsonEditor"
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { TinesParamsFields as default };
