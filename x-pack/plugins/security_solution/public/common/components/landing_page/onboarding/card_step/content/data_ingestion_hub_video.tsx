/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import { INGESTION_HUB_VIDEO_SOURCE } from '../../../../../constants';
import { WATCH_VIDEO_BUTTON_TITLE } from '../../translations';

const VIDEO_CONTENT_HEIGHT = 309;

const DataIngestionHubVideoComponent: React.FC = () => {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);
  const { euiTheme } = useEuiTheme();

  const onVideoClicked = useCallback(() => {
    setIsVideoPlaying(true);
  }, []);

  return (
    <div
      css={css`
        border-radius: 0px;
      `}
    >
      <div
        css={css`
          height: ${VIDEO_CONTENT_HEIGHT}px;
        `}
      >
        {isVideoPlaying && (
          <EuiFlexGroup
            css={css`
              background-color: ${euiTheme.colors.fullShade};
              height: 100%;
              width: 100%;
              position: absolute;
              z-index: 1;
              cursor: pointer;
            `}
            gutterSize="none"
            justifyContent="center"
            alignItems="center"
            onClick={onVideoClicked}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="playFilled" size="xxl" color={euiTheme.colors.emptyShade} />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {!isVideoPlaying && (
          <iframe
            ref={ref}
            allowFullScreen
            className="vidyard_iframe"
            frameBorder="0"
            height="100%"
            width="100%"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin"
            scrolling="no"
            allow={isVideoPlaying ? 'autoplay;' : undefined}
            src={`${INGESTION_HUB_VIDEO_SOURCE}${isVideoPlaying ? '?autoplay=1' : ''}`}
            title={WATCH_VIDEO_BUTTON_TITLE}
          />
        )}
      </div>
    </div>
  );
};

export const DataIngestionHubVideo = React.memo(DataIngestionHubVideoComponent);
