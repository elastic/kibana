/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SecurityPageName, SERVER_APP_ID, TIMELINES_PATH } from '../../common/constants';
import { TIMELINES } from '../app/translations';
import type { LinkItem } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.timelines,
  title: TIMELINES,
  path: TIMELINES_PATH,
  globalNavPosition: 6,
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.timelines', {
      defaultMessage: 'Timelines',
    }),
  ],
  links: [
    {
      id: SecurityPageName.timelinesTemplates,
      title: i18n.translate('xpack.securitySolution.appLinks.timeline.templates', {
        defaultMessage: 'Templates',
      }),
      path: `${TIMELINES_PATH}/template`,
      sideNavDisabled: true,
    },
  ],
};
