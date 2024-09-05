/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import infrastructureTabImgSrc from '../../../assets/service_tab_empty_state/service_tab_empty_state_infrastructure.png';

export const logsOnlyEmptyStateContent: { title: string; content: string; imgSrc: string } = {
  title: i18n.translate('xpack.apm.serviceTabEmptyState.infrastructureTitle', {
    defaultMessage: 'Understand what your service is running on',
  }),
  content: i18n.translate('xpack.apm.serviceTabEmptyState.infrastructureContent', {
    defaultMessage:
      'Troubleshoot service problems by seeing the infrastructure your service is running on.',
  }),
  imgSrc: infrastructureTabImgSrc,
};
