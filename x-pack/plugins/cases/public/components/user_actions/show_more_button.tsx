/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiPanel, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import * as i18n from './translations';

interface ShowMoreButtonProps {
  onShowMoreClick: () => void;
  isLoading?: boolean;
}

export const ShowMoreButton = React.memo<ShowMoreButtonProps>(
  ({ onShowMoreClick, isLoading = false }) => {
    const handleShowMore = () => {
      onShowMoreClick();
    };

    const { euiTheme } = useEuiTheme();

    return (
      <EuiPanel
        color="subdued"
        css={css`
          display: flex;
          justify-content: center;
          position: relative;
          margin-block: ${euiTheme.size.base};
          z-index: ${euiTheme.levels.menu};
          border-top: ${euiTheme.size.base} solid ${euiTheme.colors.emptyShade};
          border-bottom: ${euiTheme.size.base} solid ${euiTheme.colors.emptyShade};
          border-radius: ${euiTheme.size.base};
        `}
      >
        <EuiButton
          fill
          color="text"
          size="s"
          onClick={handleShowMore}
          data-test-subj="cases-show-more-user-actions"
          isLoading={isLoading}
        >
          {i18n.SHOW_MORE}
        </EuiButton>
      </EuiPanel>
    );
  }
);

ShowMoreButton.displayName = 'ShowMoreButton';
