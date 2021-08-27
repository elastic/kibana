/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Section } from '../sections';
import {
  AGENT,
  CONTAINER,
  CUSTOM_ERROR,
  ERROR,
  HOST,
  HTTP,
  LABELS,
  PROCESS,
  SERVICE,
  TRACE,
  TRANSACTION,
  URL,
  USER,
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
