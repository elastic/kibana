/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
} from '@elastic/eui';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import {
  JsonEditorWithMessageVariables,
  TextFieldWithMessageVariables,
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

type StoryOption = EuiComboBoxOptionOption<TinesStoryObject>;
type WebhookOption = EuiComboBoxOptionOption<TinesWebhookObject>;

const createOption = <T extends TinesStoryObject | TinesWebhookObject>(
  data: T
): EuiComboBoxOptionOption<T> => ({
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
  const { body, dedupKey, webhook } = subActionParams ?? {};

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

  // Needs same signature as editAction so it can be passed to TextFieldWithMessageVariables component
  const editSubActionParam = useCallback(
    (key: string, value: any) => {
      editSubActionParams({ [key]: value } as TinesExecuteSubActionParams);
    },
    [editSubActionParams]
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
      toasts.danger({
        title: 'Error retrieving stories from Tines', // trans
        body: storiesError.message,
      });
    }
    if (webhooksError) {
      toasts.danger({
        title: 'Error retrieving webhook actions from Tines', // trans
        body: webhooksError.message,
      });
    }
  }, [toasts, storiesError, webhooksError]);

  useEffect(() => {
    if (selectedStoryOption === undefined && webhook?.storyId && stories) {
      // Set the initial selected story option from saved storyId when stories are loaded
      const selectedStory = stories.find(({ id }) => id === webhook.storyId);
      if (selectedStory) {
        setSelectedStoryOption(createOption(selectedStory));
      } else {
        toasts.warning({
          title: 'Can not find the saved story. Please select a valid story from the selector', // TODO trans
        });
        editSubActionParams({ webhook: undefined });
      }
    }

    if (selectedStoryOption !== undefined && selectedStoryOption?.value?.id !== webhook?.storyId) {
      // Selected story changed, update storyId to save and reset selected webhook
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
        toasts.warning({
          title: 'Can not find the saved webhook. Please select a valid webhook from the selector', // TODO trans
        });
        editSubActionParams({ webhook: { storyId: webhook?.storyId } });
      }
    }

    if (selectedWebhookOption !== undefined && selectedWebhookOption?.value?.id !== webhook?.id) {
      // Selected webhook changed, update webhook to save, preserve storyId if the selected webhook has been reset
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
          label={i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.tinesAction.storyTextFieldLabel',
            {
              defaultMessage: 'Tines Story', // TODO trans
            }
          )}
        >
          <EuiComboBox
            aria-label="Tines Story" // TODO trans
            placeholder="Select a story" // TODO trans
            singleSelection={{ asPlainText: true }}
            options={storiesOptions}
            selectedOptions={selectedStoryOptions}
            onChange={onChangeStory}
            isDisabled={isLoadingStories}
            isLoading={isLoadingStories}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          error={errors.webhook}
          label={i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.tinesAction.webhookTextFieldLabel',
            {
              defaultMessage: 'Tines Webhook action', // TODO trans
            }
          )}
        >
          <EuiComboBox
            aria-label="Tines Webhook action" // TODO trans
            placeholder={selectedStoryOption ? 'Select a webhook action' : 'Select the story first'} // TODO trans
            singleSelection={{ asPlainText: true }}
            options={webhooksOptions}
            selectedOptions={selectedWebhookOptions}
            onChange={onChangeWebhook}
            isDisabled={!selectedStoryOption || isLoadingWebhooks}
            isLoading={isLoadingWebhooks}
          />
        </EuiFormRow>
        {!isTesting && (
          <EuiFormRow
            fullWidth
            error={errors.dedupKey}
            //   isInvalid={isDedupKeyInvalid}
            label={
              <>
                {i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.tinesAction.dedupKeyTextFieldLabel',
                  {
                    defaultMessage: 'Group by (optional)', // TODO trans
                  }
                )}

                <EuiIconTip
                  aria-label={'Group by'} // TODO trans
                  type="iInCircle"
                  content={
                    'Defining "Group by" keys will send multiple messages to Tines on each execution, grouping context.alerts by the defined fields (e.g. host.name)'
                  } // TODO trans
                />
              </>
            }
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editSubActionParam}
              // messageVariables={messageVariables}
              paramsProperty={'dedupKey'}
              inputTargetValue={dedupKey}
            />
          </EuiFormRow>
        )}
      </EuiFlexItem>
      {isTesting && (
        <EuiFlexItem>
          <JsonEditorWithMessageVariables
            messageVariables={messageVariables}
            paramsProperty={'body'}
            inputTargetValue={body}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.tinesAction.bodyFieldLabel',
              {
                defaultMessage: 'Body', // TODO trans
              }
            )}
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.tinesAction.bodyCodeEditorAriaLabel',
              {
                defaultMessage: 'Code editor', // TODO trans
              }
            )}
            errors={errors.body as string[]}
            onDocumentsChange={(json: string) => {
              editSubActionParam('body', json);
            }}
            onBlur={() => {
              if (!body) {
                editSubActionParam('body', '');
              }
            }}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { TinesParamsFields as default };
