/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiText } from '@elastic/eui';
import React from 'react';

import * as i18n from '../translations';
import { useKibana } from '../../../lib/kibana';

export const NoNews = React.memo(() => {
  const { getUrlForApp } = useKibana().services.application;
  return (
    <EuiText color="subdued" size="s">
      {i18n.NO_NEWS_MESSAGE}{' '}
      <EuiLink href={`${getUrlForApp('stack-management', { path: '/kibana/settings' })}`}>
        {i18n.ADVANCED_SETTINGS_LINK_TITLE}
      </EuiLink>
      {'.'}
    </EuiText>
  );
});

NoNews.displayName = 'NoNews';
