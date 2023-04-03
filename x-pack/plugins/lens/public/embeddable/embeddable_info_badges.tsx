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
import React from 'react';
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
  return (
    <EuiPopover
      panelPaddingSize="none"
      button={
        <EuiToolTip content={iconTitle}>
          <EuiButtonEmpty
            data-test-subj="lns-feature-badges-trigger"
            color={'text'}
            onClick={onButtonClick}
            title={iconTitle}
            css={css`
              block-size: ${euiTheme.size.l};
              border-radius: 0 ${euiTheme.border.radius.medium} 0 ${euiTheme.border.radius.small};
              font-size: ${xsFontSize};
              padding: 0 ${euiTheme.size.xxs};
            `}
            iconType="wrench"
            textProps={{
              css: css`
                & > * + * {
                  margin-inline-start: ${euiTheme.size.xs};
                }
              `,
            }}
          >
            {messages.length}
          </EuiButtonEmpty>
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <div>
        {messages.map(({ shortMessage, longMessage }, index) => (
          <React.Fragment key={`${shortMessage}-${index}`}>
            {index ? <EuiHorizontalRule margin="none" /> : null}
            <EuiTitle
              size="xs"
              css={css`color=${euiTheme.colors.title}`}
              className="lnsEmbeddablePanelFeatureList_header"
            >
              <h3>{shortMessage}</h3>
            </EuiTitle>
            <ul className="lnsEmbeddablePanelFeatureList">{longMessage}</ul>
          </React.Fragment>
        ))}
      </div>
    </EuiPopover>
  );
};
