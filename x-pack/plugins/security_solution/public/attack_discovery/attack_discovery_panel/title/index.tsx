/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSkeletonTitle, EuiTitle, useEuiTheme } from '@elastic/eui';
import { AssistantAvatar } from '@kbn/elastic-assistant';
import { css } from '@emotion/react';

import React from 'react';

const AVATAR_SIZE = 24; // px

interface Props {
  isLoading: boolean;
  title: string;
}

const TitleComponent: React.FC<Props> = ({ isLoading, title }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup alignItems="center" data-test-subj="title" gutterSize="s">
      <EuiFlexItem
        css={css`
          background-color: ${euiTheme.colors.lightestShade};
          border-radius: 50%;
          height: ${AVATAR_SIZE}px;
          width: ${AVATAR_SIZE}px;
          overflow: hidden;
        `}
        data-test-subj="assistantAvatar"
        grow={false}
      >
        <AssistantAvatar
          css={css`
            transform: translate(5px, 5px);
          `}
          size="xxs"
        />
      </EuiFlexItem>

      <EuiFlexItem grow={true}>
        {isLoading ? (
          <EuiSkeletonTitle
            css={css`
              inline-size: 100%;
            `}
            data-test-subj="skeletonTitle"
            size="xs"
          />
        ) : (
          <EuiTitle data-test-subj="titleText" size="xs">
            <h2>{title}</h2>
          </EuiTitle>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

TitleComponent.displayName = 'Title';

export const Title = React.memo(TitleComponent);
