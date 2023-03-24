/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiPanel, useEuiTheme } from '@elastic/eui';
import React, { useCallback } from 'react';
import { css } from '@emotion/react';

import * as i18n from './translations';

interface ShowMoreButtonProps {
  onShowMoreClick: () => void;
}

export const ShowMoreButton = React.memo<ShowMoreButtonProps>(({ onShowMoreClick }) => {
  const handleShowMore = useCallback(() => {
    onShowMoreClick();
  }, [onShowMoreClick]);

  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      color="subdued"
      css={css`
        display: flex;
        justify-content: center;
        margin-block: ${euiTheme.size.base};
        margin-inline-start: ${euiTheme.size.xxxl};
      `}
    >
      <EuiButton
        fill
        color="text"
        size="s"
        onClick={handleShowMore}
        data-test-subj="show-more-user-actions"
      >
        {i18n.SHOW_MORE}
      </EuiButton>
    </EuiPanel>
  );
});

ShowMoreButton.displayName = 'ShowMoreButton';
