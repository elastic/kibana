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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { docLinks } from '../../../common/doc_links';

interface TokenEstimateTooltipProps {
  context: number;
  total: number;
}

export const TokenEstimateTooltip: React.FC<TokenEstimateTooltipProps> = ({ context, total }) => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  const toggleTooltip = () => {
    setShowTooltip(!showTooltip);
  };

  const normalContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'tokenEstimateTooltipId',
  });

  return (
    <EuiPopover
      id={normalContextMenuPopoverId}
      button={
        <EuiButtonEmpty color="text" size="xs" onClick={toggleTooltip}>
          {total} tokens
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
                name: i18n.translate(
                  'xpack.searchPlayground.chat.message.tokenEstimateTooltip.info',
                  {
                    defaultMessage:
                      "Your request used {total} tokens, which consisted of {context} context tokens. Your model's limit is {limit} total tokens.",
                    values: {
                      total,
                      context,
                      limit: 4096,
                    },
                  }
                ),
              },
              {
                renderItem: () => (
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
                ),
              },
            ],
          },
        ]}
      />
    </EuiPopover>
  );
};
