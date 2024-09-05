/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Tab } from './types';

import dependenciesTabImgSrc from '../../../assets/service_tab_empty_state/service_tab_empty_state_dependencies.png';
import infrastructureTabImgSrc from '../../../assets/service_tab_empty_state/service_tab_empty_state_infrastructure.png';
import serviceMapTabImgSrc from '../../../assets/service_tab_empty_state/service_tab_empty_state_service_map.png';

export const emptyStateContent: Record<Tab, { title: string; content: string; imgSrc?: string }> = {
  overview: {
    title: i18n.translate('xpack.apm.serviceTabEmptyState.overviewTitle', {
      defaultMessage: 'Detect and resolve issues faster with deep visibility into your application',
    }),
    content: i18n.translate('xpack.apm.serviceTabEmptyState.overviewContent', {
      defaultMessage:
        'Understanding your application performance, relationships and dependencies by instrumenting with APM.',
    }),
  },
  dependencies: {
    title: i18n.translate('xpack.apm.serviceTabEmptyState.dependenciesTitle', {
      defaultMessage: 'Understand the dependencies for your service',
    }),
    content: i18n.translate('xpack.apm.serviceTabEmptyState.dependenciesContent', {
      defaultMessage:
        'See your services dependencies on both internal and third-party services by instrumenting with APM.',
    }),
    imgSrc: dependenciesTabImgSrc,
  },
  infrastructure: {
    title: i18n.translate('xpack.apm.serviceTabEmptyState.infrastructureTitle', {
      defaultMessage: 'Understand what your service is running on',
    }),
    content: i18n.translate('xpack.apm.serviceTabEmptyState.infrastructureContent', {
      defaultMessage:
        'Troubleshoot service problems by seeing the infrastructure your service is running on.',
    }),
    imgSrc: infrastructureTabImgSrc,
  },
  'service-map': {
    title: i18n.translate('xpack.apm.serviceTabEmptyState.serviceMapTitle', {
      defaultMessage: 'Visualise the dependencies between your services',
    }),
    content: i18n.translate('xpack.apm.serviceTabEmptyState.serviceMapContent', {
      defaultMessage:
        'See your services dependencies at a glance to help identify dependencies that may be affecting your service.',
    }),
    imgSrc: serviceMapTabImgSrc,
  },
};
