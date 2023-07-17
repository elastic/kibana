/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppNavLinkStatus, DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { LOG_EXPLORER_PROFILE_ID } from '../common/constants';

export const getLogExplorerDeepLink = ({ isVisible }: { isVisible: boolean }) => ({
  id: LOG_EXPLORER_PROFILE_ID,
  title: i18n.translate('xpack.discoverLogExplorer.deepLink', {
    defaultMessage: 'Logs Explorer',
  }),
  path: `#/p/log-explorer`,
  category: DEFAULT_APP_CATEGORIES.observability,
  euiIconType: 'logoObservability',
  navLinkStatus: isVisible ? AppNavLinkStatus.visible : AppNavLinkStatus.default,
});
