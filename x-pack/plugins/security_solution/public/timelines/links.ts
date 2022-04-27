/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SecurityPageName, TIMELINES_PATH } from '../../common/constants';
import { TIMELINES } from '../app/translations';
import { FEATURE, LinkItem } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.timelines,
  label: TIMELINES,
  url: TIMELINES_PATH,
  globalNavEnabled: true,
  features: [FEATURE.general],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.timelines', {
      defaultMessage: 'Timelines',
    }),
  ],
  globalNavOrder: 9005,
  items: [
    {
      id: SecurityPageName.timelinesTemplates,
      label: i18n.translate('xpack.securitySolution.search.timeline.templates', {
        defaultMessage: 'Templates',
      }),
      url: `${TIMELINES_PATH}/template`,
    },
  ],
};
