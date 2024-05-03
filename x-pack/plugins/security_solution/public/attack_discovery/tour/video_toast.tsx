/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiIcon, EuiToast, EuiPortal, EuiText, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import * as i18n from './translations';

const VIDEO_CONTENT_HEIGHT = 250;
const VIDEO_CONTENT_WIDTH = 400;
const VIDEO_SOURCE = '//play.vidyard.com/K6kKDBbP9SpXife9s2tHNP.html?';

const VideoComponent: React.FC = () => {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);

  const onVideoClicked = useCallback(() => {
    setIsVideoPlaying(true);
  }, []);

  return (
    <EuiPortal>
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}>
        <EuiToast onClose={() => {}} css={{ maxWidth: VIDEO_CONTENT_WIDTH }}>
          <div
            css={css`
              height: ${VIDEO_CONTENT_HEIGHT}px;
            `}
          >
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
              src={`${VIDEO_SOURCE}${isVideoPlaying ? '?autoplay=1' : ''}`}
              title={i18n.WATCH_OVERVIEW_VIDEO}
            />
          </div>
          <EuiText size="s" grow={false}>
            <h3>
              <EuiIcon type="cheer" color="success" /> {i18n.ATTACK_DISCOVERY_TOUR_VIDEO_STEP_TITLE}
            </h3>
            <p>{i18n.ATTACK_DISCOVERY_TOUR_VIDEO_STEP_DESC}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton color="success" onClick={onVideoClicked} fullWidth>
            {i18n.WATCH_OVERVIEW_VIDEO}
          </EuiButton>
        </EuiToast>
      </div>
    </EuiPortal>
  );
};

export const VideoToast = React.memo(VideoComponent);
