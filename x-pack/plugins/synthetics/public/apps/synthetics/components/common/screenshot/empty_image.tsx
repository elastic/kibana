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

export const IMAGE_WIDTH_M = 200;
export const IMAGE_HEIGHT_M = 114;

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

export const EmptyImage = ({ size, isLoading = false }: { isLoading: boolean; size?: 'm' }) => {
  const { euiTheme } = useEuiTheme();

  const imgWidth = size === 'm' ? IMAGE_WIDTH_M : IMAGE_WIDTH;
  const imgHeight = size === 'm' ? IMAGE_HEIGHT_M : IMAGE_HEIGHT;

  return (
    <div
      data-test-subj="stepScreenshotPlaceholder"
      role="img"
      aria-label={isLoading ? SCREENSHOT_LOADING_ARIA_LABEL : SCREENSHOT_NOT_AVAILABLE}
      title={isLoading ? SCREENSHOT_LOADING_ARIA_LABEL : SCREENSHOT_NOT_AVAILABLE}
      css={css`
        ${imageStyle};
        width: ${imgWidth}px;
        height: ${imgHeight}px;
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
        <div
          css={css({
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          })}
        >
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
