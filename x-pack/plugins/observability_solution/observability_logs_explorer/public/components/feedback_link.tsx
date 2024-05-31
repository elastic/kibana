/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { LOGS_EXPLORER_FEEDBACK_LINK } from '@kbn/observability-shared-plugin/common';
import React from 'react';
import { feedbackLinkTitle } from '../../common/translations';

export const FeedbackLink = React.memo(() => {
  return (
    <EuiHeaderLink
      color="primary"
      href={LOGS_EXPLORER_FEEDBACK_LINK}
      iconType="popout"
      iconSide="right"
      iconSize="s"
      target="_blank"
    >
      {feedbackLinkTitle}
    </EuiHeaderLink>
  );
});
