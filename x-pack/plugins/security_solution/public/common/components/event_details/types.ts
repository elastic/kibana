/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldSpec } from '@kbn/data-plugin/common';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';

export type EventFieldsData = FieldSpec & TimelineEventsDetailsItem;

export interface FieldsData {
  field: string;
  format: string;
  type: string;
  isObjectArray: boolean;
}

export interface EventSummaryField {
  id: string;
  legacyId?: string;
  label?: string;
  linkField?: string;
  fieldType?: string;
  overrideField?: string;
}
