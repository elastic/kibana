/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from '../../../../../common/es_fields/apm';

export type NodeField = typeof SERVICE_NAME | typeof SPAN_DESTINATION_SERVICE_RESOURCE;

export interface NodeSelection {
  field: NodeField;
  value: string;
}

export interface DiagnosticFormState {
  sourceNode?: NodeSelection;
  destinationNode?: NodeSelection;
  traceId?: string;
  isValid: boolean;
}
