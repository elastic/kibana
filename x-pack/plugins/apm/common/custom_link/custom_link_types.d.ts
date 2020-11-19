/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../elasticsearch_fieldnames';
import { FILTER_OPTIONS } from './custom_link_filter_options';

export interface CustomLinkES {
  id?: string;
  '@timestamp'?: number;
  label: string;
  url: string;
  [SERVICE_NAME]?: string[];
  [SERVICE_ENVIRONMENT]?: string[];
  [TRANSACTION_NAME]?: string[];
  [TRANSACTION_TYPE]?: string[];
}

export type FilterKey = typeof FILTER_OPTIONS[number];

export interface Filter {
  key: FilterKey | '';
  value: string;
}

export interface CustomLink {
  id?: string;
  '@timestamp'?: number;
  label: string;
  url: string;
  filters?: Filter[];
}
