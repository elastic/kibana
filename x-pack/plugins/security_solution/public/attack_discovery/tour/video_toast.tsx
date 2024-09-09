/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiIcon,
  EuiImage,
  EuiToast,
  EuiPortal,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import * as i18n from './translations';
import theGif from './overview.gif';

const VIDEO_CONTENT_WIDTH = 250;
const VIDEO_PAGE = `https://videos.elastic.co/watch/BrDaDBAAvdygvemFKNAkBW`;

const VideoComponent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const openVideoInNewTab = useCallback(() => {
    window.open(VIDEO_PAGE, '_blank');
  }, []);

  return (
    <EuiPortal>
      <div
        data-test-subj="attackDiscovery-tour-step-2"
        css={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}
      >
        <EuiToast onClose={onClose} css={{ maxWidth: VIDEO_CONTENT_WIDTH }}>
          <EuiImage
            onClick={openVideoInNewTab}
            css={{ marginTop: 20, '&:hover': { cursor: 'pointer' } }}
            src={theGif}
            data-test-subj="video-gif"
            alt={i18n.WATCH_OVERVIEW_VIDEO}
          />
          <EuiText size="s" grow={false} css={{ marginTop: 20 }}>
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
