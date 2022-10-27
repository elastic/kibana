/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
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

const createOption = <T extends TinesStoryObject | TinesWebhookObject>(
  data: T
): EuiComboBoxOptionOption<T> => ({
  key: data.id.toString(),
  value: data,
  label: data.name,
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
  const { body, webhook } = subActionParams ?? {};

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

  const [connectorId, setConnectorId] = useState<string | undefined>(actionConnector?.id);
  const [selectedStoryOption, setSelectedStoryOption] = useState<StoryOption | null | undefined>();
  const [selectedWebhookOption, setSelectedWebhookOption] = useState<
    WebhookOption | null | undefined
  >();

  const {
    response: stories,
    isLoading: isLoadingStories,
    error: storiesError,
  } = useSubAction<TinesStoriesActionParams, TinesStoriesActionResponse>({
    connectorId,
    subAction: 'stories',
  });

  const {
    response: webhooks,
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

  const storiesOptions = useMemo(() => stories?.map(createOption) ?? [], [stories]);
  const webhooksOptions = useMemo(() => webhooks?.map(createOption) ?? [], [webhooks]);

  useEffect(() => {
    if (storiesError) {
      toasts.danger({ title: i18n.STORIES_ERROR, body: storiesError.message });
    }
    if (webhooksError) {
      toasts.danger({ title: i18n.WEBHOOKS_ERROR, body: webhooksError.message });
    }
  }, [toasts, storiesError, webhooksError]);

  useEffect(() => {
    if (selectedStoryOption === undefined && webhook?.storyId && stories) {
      // Set the initial selected story option from saved storyId when stories are loaded
      const selectedStory = stories.find(({ id }) => id === webhook.storyId);
      if (selectedStory) {
        setSelectedStoryOption(createOption(selectedStory));
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
        setSelectedWebhookOption(createOption(selectedWebhook));
      } else {
        toasts.warning({ title: i18n.WEBHOOK_NOT_FOUND_WARNING });
        editSubActionParams({ webhook: { storyId: webhook?.storyId } });
      }
    }

    if (selectedWebhookOption !== undefined && selectedWebhookOption?.value?.id !== webhook?.id) {
      // Selected webhook changed, update webhook param, preserve storyId if the selected webhook has been reset
      editSubActionParams({
        webhook: selectedWebhookOption
          ? selectedWebhookOption?.value
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
          label={i18n.STORY_LABEL}
          helpText={i18n.STORY_HELP}
        >
          <EuiComboBox
            aria-label={i18n.STORY_PLACEHOLDER}
            placeholder={i18n.STORY_ARIA_LABEL}
            singleSelection={{ asPlainText: true }}
            options={storiesOptions}
            selectedOptions={selectedStoryOptions}
            onChange={onChangeStory}
            isDisabled={isLoadingStories}
            isLoading={isLoadingStories}
            fullWidth
            data-test-subj="tines-storySelector"
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          error={errors.webhook}
          label={i18n.WEBHOOK_LABEL}
          helpText={i18n.WEBHOOK_HELP}
        >
          <EuiComboBox
            aria-label={i18n.WEBHOOK_ARIA_LABEL}
            placeholder={
              selectedStoryOption ? i18n.WEBHOOK_PLACEHOLDER : i18n.WEBHOOK_DISABLED_PLACEHOLDER
            }
            singleSelection={{ asPlainText: true }}
            options={webhooksOptions}
            selectedOptions={selectedWebhookOptions}
            onChange={onChangeWebhook}
            isDisabled={!selectedStoryOption || isLoadingWebhooks}
            isLoading={isLoadingWebhooks}
            fullWidth
            data-test-subj="tines-webhookSelector"
          />
        </EuiFormRow>
      </EuiFlexItem>
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
