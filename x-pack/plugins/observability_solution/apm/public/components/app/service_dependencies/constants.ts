/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import dependenciesTabImgSrc from '../../../assets/service_tab_empty_state/service_tab_empty_state_dependencies.png';

export const logsOnlyEmptyStateContent: { title: string; content: string; imgSrc: string } = {
  title: i18n.translate('xpack.apm.serviceTabEmptyState.dependenciesTitle', {
    defaultMessage: 'Understand the dependencies for your service',
  }),
  content: i18n.translate('xpack.apm.serviceTabEmptyState.dependenciesContent', {
    defaultMessage:
      'See your services dependencies on both internal and third-party services by instrumenting with APM.',
  }),
  imgSrc: dependenciesTabImgSrc,
};
