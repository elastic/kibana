/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme, useEuiBackgroundColor, EuiIcon, EuiLoadingContent } from '@elastic/eui';

export const THUMBNAIL_WIDTH = 96;
export const THUMBNAIL_HEIGHT = 64;

export const thumbnailStyle = css`
  padding: 0;
  margin: auto;
  width: ${THUMBNAIL_WIDTH}px;
  height: ${THUMBNAIL_HEIGHT}px;
  object-fit: contain;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const EmptyThumbnail = ({
  isLoading = false,
  width = THUMBNAIL_WIDTH,
  height = THUMBNAIL_HEIGHT,
}: {
  isLoading: boolean;
  width?: number;
  height?: number;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      data-test-subj="stepScreenshotPlaceholder"
      role="img"
      aria-label={isLoading ? SCREENSHOT_LOADING_ARIA_LABEL : SCREENSHOT_NOT_AVAILABLE}
      title={isLoading ? SCREENSHOT_LOADING_ARIA_LABEL : SCREENSHOT_NOT_AVAILABLE}
      css={css`
        ${thumbnailStyle};
        width: ${width}px;
        height: ${height}px;
        background: ${useEuiBackgroundColor('subdued')};
        border: ${euiTheme.border.thin};
      `}
    >
      {isLoading ? (
        <EuiLoadingContent
          data-test-subj="stepScreenshotPlaceholderLoading"
          css={css`
            width: 100%;
            height: 100%;
            transform: scale(1, 100); // To create a skeleton loading effect
          `}
        />
      ) : (
        <EuiIcon
          data-test-subj="stepScreenshotNotAvailable"
          type="eyeClosed"
          color={euiTheme.colors.disabledText}
        />
      )}
    </div>
  );
};

export const SCREENSHOT_LOADING_ARIA_LABEL = i18n.translate(
  'xpack.synthetics.monitor.step.screenshot.ariaLabel',
  {
    defaultMessage: 'Step screenshot is being loaded.',
  }
);

export const SCREENSHOT_NOT_AVAILABLE = i18n.translate(
  'xpack.synthetics.monitor.step.screenshot.notAvailable',
  {
    defaultMessage: 'Step screenshot is not available.',
  }
);
