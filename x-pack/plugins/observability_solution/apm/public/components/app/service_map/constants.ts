/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import serviceMapTabImgSrc from '../../../assets/service_tab_empty_state/service_tab_empty_state_service_map.png';

export const logsOnlyEmptyStateContent: { title: string; content: string; imgSrc: string } = {
  title: i18n.translate('xpack.apm.serviceTabEmptyState.serviceMapTitle', {
    defaultMessage: 'Visualise the dependencies between your services',
  }),
  content: i18n.translate('xpack.apm.serviceTabEmptyState.serviceMapContent', {
    defaultMessage:
      'See your services dependencies at a glance to help identify dependencies that may be affecting your service.',
  }),
  imgSrc: serviceMapTabImgSrc,
};
