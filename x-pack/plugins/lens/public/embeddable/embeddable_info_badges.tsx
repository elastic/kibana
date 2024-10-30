/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPopover,
  EuiToolTip,
  EuiHorizontalRule,
  EuiTitle,
  useEuiTheme,
  EuiButtonEmpty,
  useEuiFontSize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { useState } from 'react';
import type { UserMessage } from '../types';
import './embeddable_info_badges.scss';
import { getLongMessage } from '../user_messages_utils';

export const EmbeddableFeatureBadge = ({ messages }: { messages: UserMessage[] }) => {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = () => setIsPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsPopoverOpen(false);
  if (!messages.length) {
    return null;
  }
  const iconTitle = i18n.translate('xpack.lens.embeddable.featureBadge.iconDescription', {
    defaultMessage: `{count} visualization {count, plural, one {modifier} other {modifiers}}`,
    values: {
      count: messages.length,
    },
  });
  // compact messages be grouping longMessage together on matching unique-id
  const groupedMessages: Map<string, UserMessage[]> = new Map();
  for (const message of messages) {
    const group = groupedMessages.get(message.uniqueId) ?? [];
    group.push(message);
    groupedMessages.set(message.uniqueId, group);
  }
  return (
    <EuiPopover
      panelPaddingSize="none"
      button={
        <EuiToolTip content={iconTitle}>
          <EuiButtonEmpty
            data-test-subj="lns-feature-badges-trigger"
            className="lnsEmbeddablePanelFeatureList_button"
            color={'text'}
            onClick={onButtonClick}
            title={iconTitle}
            size="s"
            css={css`
              color: transparent;
              font-size: ${xsFontSize};
              height: ${euiTheme.size.l} !important;
              padding-inline: ${euiTheme.size.xs};
              .euiButtonEmpty__content {
                gap: ${euiTheme.size.xs};
              }
            `}
            iconType="wrench"
          >
            {groupedMessages.size}
          </EuiButtonEmpty>
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <div
        css={css`
          max-width: 280px;
        `}
        data-test-subj="lns-feature-badges-panel"
      >
        {[...groupedMessages.entries()].map(([uniqueId, messageGroup], index) => {
          const [{ shortMessage }] = messageGroup;
          return (
            <Fragment key={uniqueId}>
              {index > 0 && (
                <EuiHorizontalRule
                  margin="none"
                  data-test-subj="lns-feature-badges-horizontal-rule"
                />
              )}
              <aside
                css={css`
                  padding: ${euiTheme.size.base};
                `}
              >
                <EuiTitle size="xxs" css={css`color=${euiTheme.colors.title}`}>
                  <h3>{shortMessage}</h3>
                </EuiTitle>
                <ul className="lnsEmbeddablePanelFeatureList">
                  {messageGroup.map((message, i) => (
                    <Fragment key={`${uniqueId}-${i}`}>{getLongMessage(message)}</Fragment>
                  ))}
                </ul>
              </aside>
            </Fragment>
          );
        })}
      </div>
    </EuiPopover>
  );
};
