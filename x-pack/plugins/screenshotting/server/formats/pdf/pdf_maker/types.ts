/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ensure, SerializableRecord } from '@kbn/utility-types';

export type TemplateLayout = Ensure<
  {
    orientation: 'landscape' | 'portrait' | undefined;
    useReportingBranding: boolean;
    hasHeader: boolean;
    hasFooter: boolean;
    pageSize:
      | string
      | {
          width: number;
          height: number | 'auto';
        };
  },
  SerializableRecord
>;
