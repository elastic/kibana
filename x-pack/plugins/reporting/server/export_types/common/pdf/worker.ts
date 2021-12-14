/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ensure, SerializableRecord } from '@kbn/utility-types';
import type { TemplateLayout } from './get_template_copy';

export type PdfWorkerData = Ensure<
  {
    layout: TemplateLayout;
    title: string;
    content: SerializableRecord[];

    logo?: string;
  },
  SerializableRecord
>;
