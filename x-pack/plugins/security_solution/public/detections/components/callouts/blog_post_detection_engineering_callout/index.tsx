/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/css';
import avcBannerBackground from '@kbn/avc-banner/src/avc_banner_background.svg';
import { EuiSpacer, EuiButton, EuiCallOut, useEuiTheme } from '@elastic/eui';
import { type CallOutMessage } from '../../../../common/components/callouts';
import { useCallOutStorage } from '../../../../common/components/callouts/use_callout_storage';
import * as i18n from './translations';

const BLOG_POST_URL = 'https://www.elastic.co/blog/elastic-security-detection-engineering';

const calloutMessage: CallOutMessage = {
  type: 'success',
  id: 'blog-post-elastic-security-detection-engineering',
  title: i18n.NEW_FEATURES_BLOG_POST_CALLOUT_TITLE,
  description: <Description />,
};

export function BlogPostDetectionEngineeringCallout() {
  const { euiTheme } = useEuiTheme();

  const { isVisible, dismiss } = useCallOutStorage([calloutMessage], 'detections');

  const calloutStyles = css({
    paddingLeft: `${euiTheme.size.xl}`,
    backgroundImage: `url(${avcBannerBackground})`,
    backgroundRepeat: 'no-repeat',
    backgroundPositionX: 'right',
    backgroundPositionY: 'bottom',
  });

  const handleDismiss = useCallback(() => {
    dismiss(calloutMessage);
  }, [dismiss]);

  if (!isVisible(calloutMessage)) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={calloutMessage.title}
        color={calloutMessage.type}
        iconType="cheer"
        onDismiss={handleDismiss}
        className={calloutStyles}
      >
        {calloutMessage.description}
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
}

function Description() {
  return (
    <>
      {i18n.NEW_FEATURES_BLOG_POST_CALLOUT_DESCRIPTION}
      <EuiSpacer size="s" />
      <EuiButton size="s" color="success" href={BLOG_POST_URL} target="_blank">
        {i18n.NEW_FEATURES_BLOG_POST_CALLOUT_BUTTON_LABEL}
      </EuiButton>
    </>
  );
}
