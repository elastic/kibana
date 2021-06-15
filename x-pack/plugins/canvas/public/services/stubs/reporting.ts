/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingService } from '../reporting';

export const reportingService: ReportingService = {
  start: {
    usesUiCapabilities: () => true,
    components: {
      ReportingPanelPDF: () => (null as unknown) as JSX.Element,
    },
    getDefaultLayoutSelectors: () => ({
      screenshot: 'stub',
      renderComplete: 'stub',
      itemsCountAttribute: 'stub',
      timefilterDurationAttribute: 'stub',
    }),
  },
};
