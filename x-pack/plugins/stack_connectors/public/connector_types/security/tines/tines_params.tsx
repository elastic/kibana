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
// import { ActionParamsProps } from '../../../../types';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import {
  JsonEditorWithMessageVariables,
  TextFieldWithMessageVariables,
  useSubAction,
  useKibana,
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  TinesWebhooksActionParams,
  TinesStoriesActionResponse,
  TinesWebhooksActionResponse,
  TinesStoriesActionParams,
  TinesActionParams,
  SubActionParams,
} from './types';
import { SUB_ACTION } from '../../../../common/connector_types/security/tines/constants';
import {
  TinesStoryObject,
  TinesWebhookObject,
} from '../../../../common/connector_types/security/tines/types';

type StoryOption = EuiComboBoxOptionOption<TinesStoryObject>;
type WebhookOption = EuiComboBoxOptionOption<TinesWebhookObject>;

const createOption = <T extends TinesStoryObject | TinesWebhookObject>(
  data: T
): EuiComboBoxOptionOption<T> => ({
  value: data,
  label: data.name,
});

const TinesParamsFields: React.FunctionComponent<ActionParamsProps<TinesActionParams>> = ({
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
    (params: SubActionParams) => {
      editAction('subActionParams', { ...subActionParams, ...params }, index);
    },
    [editAction, index, subActionParams]
  );

  // Needs same signature as editAction so it can be passed to TextFieldWithMessageVariables component
  const editSubActionParam = useCallback(
    (key: string, value: any) => {
      editSubActionParams({ [key]: value } as SubActionParams);
    },
    [editSubActionParams]
  );

  const [selectedStoryOption, setSelectedStoryOption] = useState<StoryOption | null>(null);
  const [selectedWebhookOption, setSelectedWebhookOption] = useState<WebhookOption | null>(null);

  const selectedStoryOptions = useMemo(
    () => (selectedStoryOption ? [selectedStoryOption] : []),
    [selectedStoryOption]
  );

  const selectedWebhookOptions = useMemo(
    () => (selectedWebhookOption ? [selectedWebhookOption] : []),
    [selectedWebhookOption]
  );

  const {
    response: stories,
    isLoading: isLoadingStories,
    error: storiesError,
  } = useSubAction<TinesStoriesActionParams, TinesStoriesActionResponse>({
    connectorId: actionConnector?.id,
    subAction: 'stories',
  });

  const {
    response: webhooks,
    isLoading: isLoadingWebhooks,
    error: webhooksError,
  } = useSubAction<TinesWebhooksActionParams, TinesWebhooksActionResponse>({
    connectorId: actionConnector?.id,
    subAction: 'webhooks',
    ...(selectedStoryOption?.value?.id
      ? { subActionParams: { storyId: selectedStoryOption?.value?.id } }
      : { disabled: true }),
  });

  useEffect(() => {
    if (storiesError) {
      toasts.danger({
        title: 'Error retrieving stories from Tines', // trans
        body: storiesError.message,
      });
    }
  }, [storiesError, toasts]);

  useEffect(() => {
    if (webhooksError) {
      toasts.danger({
        title: 'Error retrieving webhook actions from Tines', // trans
        body: webhooksError.message,
      });
    }
  }, [webhooksError, toasts]);

  const storiesOptions = useMemo(() => stories?.map(createOption) ?? [], [stories]);
  const webhooksOptions = useMemo(() => webhooks?.map(createOption) ?? [], [webhooks]);

  const onChangeStory = useCallback(
    ([selected]: StoryOption[]) => {
      const newStory = selected?.value;
      if (webhook?.storyId !== newStory?.id) {
        editSubActionParams({ webhook: { storyId: newStory?.id } });
        setSelectedStoryOption(selected ?? null);
        setSelectedWebhookOption(null);
      }
    },
    [editSubActionParams, webhook?.storyId]
  );

  const onChangeWebhook = useCallback(
    ([selected]: WebhookOption[]) => {
      const newWebhook = selected?.value;
      if (webhook?.id !== newWebhook?.id) {
        editSubActionParams({ webhook: newWebhook });
        setSelectedWebhookOption(selected ?? null);
      }
    },
    [editSubActionParams, webhook]
  );

  // Set the selected story option from saved storyId when stories are loaded
  useEffect(() => {
    if (!selectedStoryOption && webhook?.storyId && stories) {
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
  }, [editSubActionParams, selectedStoryOption, webhook?.storyId, stories, toasts]);

  // Set the selected webhook option from saved webhookId when webhooks are loaded
  useEffect(() => {
    if (!selectedWebhookOption && webhook?.id && webhooks) {
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
  }, [editSubActionParams, selectedWebhookOption, toasts, webhook, webhooks]);

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
            placeholder={selectedStoryOption ? 'Select a webhook action' : 'Select a story first'} // TODO trans
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
