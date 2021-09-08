/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Section } from '../sections';
import {
  AGENT,
  LABELS,
  MESSAGE_SPAN,
  SERVICE,
  SPAN,
  TRACE,
  TRANSACTION,
} from '../sections';

export const SPAN_METADATA_SECTIONS: Section[] = [
  LABELS,
  TRACE,
  TRANSACTION,
  SPAN,
  SERVICE,
  MESSAGE_SPAN,
  AGENT,
];
