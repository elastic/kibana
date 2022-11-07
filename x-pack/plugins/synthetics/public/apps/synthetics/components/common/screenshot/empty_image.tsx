/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  useEuiTheme,
  useEuiBackgroundColor,
  EuiIcon,
  EuiLoadingContent,
  EuiText,
} from '@elastic/eui';

export const IMAGE_WIDTH = 360;
export const IMAGE_HEIGHT = 203;

export const imageStyle = css`
  padding: 0;
  margin: auto;
  width: ${IMAGE_WIDTH}px;
  height: ${IMAGE_HEIGHT}px;
  object-fit: contain;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const EmptyImage = ({
  isLoading = false,
  width = IMAGE_WIDTH,
  height = IMAGE_HEIGHT,
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
        ${imageStyle};
        width: ${width}px;
        height: ${height}px;
        background: ${useEuiBackgroundColor('subdued')};
        border: ${euiTheme.border.thin};
      `}
    >
      {isLoading ? (
        <EuiLoadingContent
          lines={1}
          data-test-subj="stepScreenshotPlaceholderLoading"
          css={css`
            width: 100%;
            height: 8%;
            transform: scale(1, 13); // To create a skeleton loading effect
          `}
        />
      ) : (
        <div>
          <EuiIcon
            data-test-subj="stepScreenshotNotAvailable"
            type="eyeClosed"
            color={euiTheme.colors.disabledText}
          />
          <EuiText color={euiTheme.colors.disabledText}>{IMAGE_UN_AVAILABLE}</EuiText>
        </div>
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

export const IMAGE_UN_AVAILABLE = i18n.translate(
  'xpack.synthetics.monitor.step.screenshot.unAvailable',
  {
    defaultMessage: 'Image unavailable',
  }
);
