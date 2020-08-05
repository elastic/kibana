/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Section,
  ERROR,
  LABELS,
  HTTP,
  HOST,
  CONTAINER,
  SERVICE,
  PROCESS,
  AGENT,
  URL,
  USER,
  CUSTOM_ERROR,
  TRACE,
  TRANSACTION,
} from '../sections';

export const ERROR_METADATA_SECTIONS: Section[] = [
  { ...LABELS, required: true },
  TRACE,
  TRANSACTION,
  ERROR,
  HTTP,
  HOST,
  CONTAINER,
  SERVICE,
  PROCESS,
  AGENT,
  URL,
  { ...USER, required: true },
  CUSTOM_ERROR,
];
