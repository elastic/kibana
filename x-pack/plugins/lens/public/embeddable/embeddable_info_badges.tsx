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

  const messagesWithoutUniqueId = messages.filter(({ uniqueId }) => !uniqueId);
  // compact messages be grouping longMessage together on matching unique-id
  const messagesGroupedByUniqueId: Record<string, UserMessage[]> = {};
  for (const message of messages) {
    if (message.uniqueId) {
      if (!messagesGroupedByUniqueId[message.uniqueId]) {
        messagesGroupedByUniqueId[message.uniqueId] = [];
      }
      messagesGroupedByUniqueId[message.uniqueId].push(message);
    }
  }
  const messageCount =
    messagesWithoutUniqueId.length + Object.keys(messagesGroupedByUniqueId).length;
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
            {messageCount}
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
        {messagesWithoutUniqueId.map(({ shortMessage, longMessage }, index) => {
          return (
            <Fragment key={`${shortMessage}-${index}`}>
              {index ? (
                <EuiHorizontalRule
                  margin="none"
                  data-test-subj="lns-feature-badges-horizontal-rule"
                />
              ) : null}
              <aside
                css={css`
                  padding: ${euiTheme.size.base};
                `}
              >
                <EuiTitle size="xxs" css={css`color=${euiTheme.colors.title}`}>
                  <h3>{shortMessage}</h3>
                </EuiTitle>
                <ul className="lnsEmbeddablePanelFeatureList">{longMessage}</ul>
              </aside>
            </Fragment>
          );
        })}
        {Object.entries(messagesGroupedByUniqueId).map(([uniqueId, messagesByUniqueId], index) => {
          const hasHorizontalRule = messagesWithoutUniqueId.length || index;
          const [{ shortMessage }] = messagesByUniqueId;
          return (
            <Fragment key={uniqueId}>
              {hasHorizontalRule ? (
                <EuiHorizontalRule
                  margin="none"
                  data-test-subj="lns-feature-badges-horizontal-rule"
                />
              ) : null}
              <aside
                css={css`
                  padding: ${euiTheme.size.base};
                `}
              >
                <EuiTitle size="xxs" css={css`color=${euiTheme.colors.title}`}>
                  <h3>{shortMessage}</h3>
                </EuiTitle>
                <ul className="lnsEmbeddablePanelFeatureList">
                  {messagesByUniqueId.map(({ longMessage }, i) => (
                    <Fragment key={`${uniqueId}-${i}`}>{longMessage}</Fragment>
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
