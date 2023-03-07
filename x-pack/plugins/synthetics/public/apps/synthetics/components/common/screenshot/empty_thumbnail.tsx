/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  useEuiTheme,
  useEuiBackgroundColor,
  EuiIcon,
  EuiLoadingContent,
  EuiText,
} from '@elastic/eui';

import {
  getConfinedScreenshotSize,
  ScreenshotImageSize,
  THUMBNAIL_SCREENSHOT_SIZE,
} from './screenshot_size';

export const thumbnailStyle = {
  padding: 0,
  margin: 'auto',
  objectFit: 'contain' as const,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const EmptyThumbnail = ({
  isLoading = false,
  animateLoading,
  size = THUMBNAIL_SCREENSHOT_SIZE,
  unavailableMessage,
  borderRadius,
}: {
  isLoading: boolean;
  animateLoading: boolean;
  size: ScreenshotImageSize | [number, number];
  unavailableMessage?: string;
  borderRadius?: string | number;
}) => {
  const { euiTheme } = useEuiTheme();
  const { width, height } = getConfinedScreenshotSize(size);
  const noDataMessage = unavailableMessage ?? SCREENSHOT_NOT_AVAILABLE;

  return (
    <div
      data-test-subj="stepScreenshotPlaceholder"
      role="img"
      aria-label={isLoading ? SCREENSHOT_LOADING_ARIA_LABEL : noDataMessage}
      title={isLoading ? SCREENSHOT_LOADING_ARIA_LABEL : noDataMessage}
      style={{
        ...thumbnailStyle,
        width,
        height,
        background: useEuiBackgroundColor('subdued'),
        border: euiTheme.border.thin,
        ...(borderRadius ? { borderRadius } : {}),
      }}
    >
      {isLoading ? (
        <EuiLoadingContent
          data-test-subj="stepScreenshotPlaceholderLoading"
          style={{
            width: '100%',
            transform: `scale(1, ${animateLoading ? '100' : '0'})`, // To create a skeleton loading effect when animateLoading is true
          }}
          lines={1}
        />
      ) : (
        <div
          style={{
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <EuiIcon
            data-test-subj="stepScreenshotNotAvailable"
            type="eyeClosed"
            color={euiTheme.colors.disabledText}
          />

          {unavailableMessage ? (
            <EuiText color={euiTheme.colors.disabledText}>{unavailableMessage}</EuiText>
          ) : null}
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
