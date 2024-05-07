/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiIcon, EuiToast, EuiPortal, EuiText, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect } from 'react';
import * as i18n from './translations';

const VIDEO_CONTENT_HEIGHT = 160;
const VIDEO_CONTENT_WIDTH = 250;
const VIDEO_ID = 'BrDaDBAAvdygvemFKNAkBW';
const VIDEO_SOURCE = `//play.vidyard.com/${VIDEO_ID}.html`;
const VIDEO_PAGE = `https://videos.elastic.co/watch/${VIDEO_ID}`;

const VideoComponent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [isIframeFocused, setIsIframeFocused] = React.useState(false);

  const openVideoInNewTab = useCallback(() => {
    window.open(VIDEO_PAGE, '_blank');
  }, []);

  const onIframeClick = useCallback(() => {
    if (isIframeFocused) {
      openVideoInNewTab();
    }
  }, [isIframeFocused, openVideoInNewTab]);

  useEffect(() => {
    // Focus the page
    window.focus();
    // Add listener to check when page is not focussed
    // (i.e. iframe is clicked into)
    window.addEventListener('blur', onIframeClick);
    return () => window.removeEventListener('blur', onIframeClick);
  }, [onIframeClick]);
  const handleOnMouseOver = useCallback(() => {
    setIsIframeFocused(true);
  }, []);
  const handleOnMouseOut = useCallback(() => {
    setIsIframeFocused(false);
  }, []);

  return (
    <EuiPortal>
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}>
        <EuiToast onClose={onClose} css={{ maxWidth: VIDEO_CONTENT_WIDTH }}>
          <div
            css={css`
              height: ${VIDEO_CONTENT_HEIGHT}px;
            `}
            onMouseOver={handleOnMouseOver}
            onMouseOut={handleOnMouseOut}
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
              // since we cannot go fullscreen, we are autoplaying and removing the controls
              // onClick, the video will open in a new tab
              allow={'autoplay'}
              src={`${VIDEO_SOURCE}?autoplay=1&controls=0`}
              title={i18n.WATCH_OVERVIEW_VIDEO}
            />
          </div>
          <EuiText size="s" grow={false}>
            <h4>
              <EuiIcon type="cheer" color="success" /> {i18n.ATTACK_DISCOVERY_TOUR_VIDEO_STEP_TITLE}
            </h4>
            <p>{i18n.ATTACK_DISCOVERY_TOUR_VIDEO_STEP_DESC}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton color="success" onClick={openVideoInNewTab} fullWidth>
            {i18n.WATCH_OVERVIEW_VIDEO}
          </EuiButton>
        </EuiToast>
      </div>
    </EuiPortal>
  );
};

export const VideoToast = React.memo(VideoComponent);
