/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import React, { useCallback } from 'react';

import * as i18n from '../translations';
import { useKibana } from '../../../lib/kibana';
import { LinkAnchor } from '../../links';

export const NoNews = React.memo(() => {
  const { getUrlForApp, navigateToApp, capabilities } = useKibana().services.application;
  const canSeeAdvancedSettings = capabilities.management.kibana.settings ?? false;
  const goToKibanaSettings = useCallback(
    () => navigateToApp('management', { path: '/kibana/settings' }),
    [navigateToApp]
  );

  return (
    <EuiText color="subdued" size="s">
      {canSeeAdvancedSettings ? i18n.NO_NEWS_MESSAGE_ADMIN : i18n.NO_NEWS_MESSAGE}
      {canSeeAdvancedSettings && (
        <>
          {' '}
          <LinkAnchor
            onClick={goToKibanaSettings}
            href={`${getUrlForApp('management', { path: '/kibana/settings' })}`}
          >
            {i18n.ADVANCED_SETTINGS_LINK_TITLE}
          </LinkAnchor>
          {'.'}
        </>
      )}
    </EuiText>
  );
});

NoNews.displayName = 'NoNews';
