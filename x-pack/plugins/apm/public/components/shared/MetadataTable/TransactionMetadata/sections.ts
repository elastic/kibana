/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Section } from '../sections';
import {
  AGENT,
  CLIENT,
  CONTAINER,
  CUSTOM_TRANSACTION,
  HOST,
  HTTP,
  LABELS,
  MESSAGE_TRANSACTION,
  PAGE,
  PROCESS,
  SERVICE,
  TRACE,
  TRANSACTION,
  URL,
  USER,
  USER_AGENT,
} from '../sections';

export const TRANSACTION_METADATA_SECTIONS: Section[] = [
  { ...LABELS, required: true },
  TRACE,
  TRANSACTION,
  HTTP,
  HOST,
  CLIENT,
  CONTAINER,
  SERVICE,
  PROCESS,
  MESSAGE_TRANSACTION,
  AGENT,
  URL,
  { ...PAGE, key: 'transaction.page' },
  { ...USER, required: true },
  USER_AGENT,
  CUSTOM_TRANSACTION,
];
