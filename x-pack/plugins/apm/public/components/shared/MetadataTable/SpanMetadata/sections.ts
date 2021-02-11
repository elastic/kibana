/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Section,
  AGENT,
  SERVICE,
  SPAN,
  LABELS,
  TRANSACTION,
  TRACE,
  MESSAGE_SPAN,
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
