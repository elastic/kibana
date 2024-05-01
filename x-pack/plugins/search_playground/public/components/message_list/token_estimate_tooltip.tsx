/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiPopover,
  EuiPanel,
  useGeneratedHtmlId,
  EuiLink,
  EuiI18nNumber,
  EuiDescriptionList,
  EuiTextColor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFormContext } from 'react-hook-form';
import { docLinks } from '../../../common/doc_links';
import { useLLMsModels } from '../../hooks/use_llms_models';
import { ChatForm, ChatFormFields } from '../../types';

interface TokenEstimateTooltipProps {
  context: number;
  total: number;
}

export const TokenEstimateTooltip: React.FC<TokenEstimateTooltipProps> = ({ context, total }) => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const models = useLLMsModels();
  const { getValues } = useFormContext<ChatForm>();
  const formValues = getValues(ChatFormFields.summarizationModel);

  const selectedModel = models.find((m) => m.value === formValues?.value);

  const toggleTooltip = () => {
    setShowTooltip(!showTooltip);
  };

  const normalContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'tokenEstimateTooltipId',
  });

  const modelLimit = selectedModel?.promptTokenLimit;

  return (
    <EuiPopover
      id={normalContextMenuPopoverId}
      button={
        <EuiButtonEmpty
          color="text"
          size="xs"
          onClick={toggleTooltip}
          data-test-subj="token-tooltip-button"
        >
          <FormattedMessage
            id="xpack.searchPlayground.chat.message.tokenEstimateTooltip.label"
            defaultMessage="{total}{limit} tokens sent"
            values={{
              total: (
                <strong>
                  <EuiI18nNumber value={total} />
                </strong>
              ),
              limit: modelLimit ? (
                <strong>
                  {` /`} <EuiI18nNumber value={modelLimit} />
                </strong>
              ) : null,
            }}
          />
        </EuiButtonEmpty>
      }
      isOpen={showTooltip}
      closePopover={toggleTooltip}
      panelPaddingSize="none"
      anchorPosition="upCenter"
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            items: [
              {
                name: (
                  <strong data-test-subj="token-tooltip-title">
                    <FormattedMessage
                      id="xpack.searchPlayground.chat.message.tokenEstimateTooltip.title"
                      defaultMessage="Approximate breakdown"
                    />
                  </strong>
                ),
              },
              {
                renderItem: () => (
                  <EuiPanel
                    paddingSize="s"
                    hasShadow={false}
                    data-test-subj="token-tooltip-breakdown-1"
                  >
                    <EuiDescriptionList
                      compressed
                      rowGutterSize="s"
                      columnGutterSize="s"
                      listItems={[
                        {
                          description: (
                            <FormattedMessage
                              id="xpack.searchPlayground.chat.message.tokenEstimateTooltip.contextTokens"
                              defaultMessage="Context tokens"
                            />
                          ),
                          title: <EuiI18nNumber value={context} />,
                        },
                        {
                          description: (
                            <FormattedMessage
                              id="xpack.searchPlayground.chat.message.tokenEstimateTooltip.instructionTokens"
                              defaultMessage="Instruction tokens"
                            />
                          ),
                          title: <EuiI18nNumber value={total - context} />,
                        },
                      ]}
                      type="column"
                      columnWidths={[2, 4]}
                    />
                  </EuiPanel>
                ),
              },
              {
                isSeparator: true,
              },
              {
                renderItem: () => (
                  <EuiPanel
                    paddingSize="s"
                    hasShadow={false}
                    data-test-subj="token-tooltip-breakdown-2"
                  >
                    <EuiDescriptionList
                      compressed
                      rowGutterSize="s"
                      columnGutterSize="s"
                      listItems={[
                        {
                          description: (
                            <FormattedMessage
                              id="xpack.searchPlayground.chat.message.tokenEstimateTooltip.totalTokens"
                              defaultMessage="Total tokens"
                            />
                          ),
                          title: <EuiI18nNumber value={total} />,
                        },
                        ...(modelLimit
                          ? [
                              {
                                description: (
                                  <EuiTextColor color="subdued">
                                    <FormattedMessage
                                      id="xpack.searchPlayground.chat.message.tokenEstimateTooltip.modelLimit"
                                      defaultMessage="Max for this model"
                                    />
                                  </EuiTextColor>
                                ),
                                title: (
                                  <EuiTextColor color="subdued">
                                    <EuiI18nNumber value={modelLimit} />
                                  </EuiTextColor>
                                ),
                              },
                            ]
                          : []),
                      ]}
                      type="column"
                      columnWidths={[2, 4]}
                    />
                  </EuiPanel>
                ),
              },
              {
                renderItem: () => (
                  <>
                    <EuiPanel paddingSize="s" hasShadow={false}>
                      <EuiLink
                        href={docLinks.chatPlayground}
                        target="_blank"
                        data-test-subj="context-optimization-documentation-link"
                      >
                        <FormattedMessage
                          id="xpack.searchPlayground.chat.message.tokenEstimateTooltip.learnMoreLink"
                          defaultMessage=" Learn more."
                        />
                      </EuiLink>
                    </EuiPanel>
                  </>
                ),
              },
            ],
          },
        ]}
      />
    </EuiPopover>
  );
};
