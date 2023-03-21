/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { fullHeightContentStyles } from '../../../../page_template.styles';
import { LogsPageTemplate, LogsPageTemplateProps } from '../../shared/page_template';

export const LogStreamPageTemplate: React.FC<LogsPageTemplateProps> = React.memo((props) => (
  <div className={APP_WRAPPER_CLASS}>
    <LogsPageTemplate
      pageHeader={{
        pageTitle: streamTitle,
      }}
      pageSectionProps={{
        contentProps: {
          css: fullHeightContentStyles,
        },
      }}
      {...props}
    />
  </div>
));

const streamTitle = i18n.translate('xpack.infra.logs.streamPageTitle', {
  defaultMessage: 'Stream',
});
