/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas';
import type { BrowserField } from '../../containers/source';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';

export type EventFieldsData = BrowserField & TimelineEventsDetailsItem;

export interface FieldsData {
  field: string;
  format: string;
  type: string;
  isObjectArray: boolean;
}

export interface EnrichedFieldInfo {
  data: FieldsData | EventFieldsData;
  eventId: string;
  fieldFromBrowserField?: BrowserField;
  scopeId: string;
  values: string[] | null | undefined;
  linkValue?: string;
}

export type EnrichedFieldInfoWithValues = EnrichedFieldInfo & { values: string[] };

export interface EventSummaryField {
  id: string;
  legacyId?: string;
  label?: string;
  linkField?: string;
  fieldType?: string;
  overrideField?: string;
}

export interface RawEventData {
  fields: ParsedTechnicalFields;
  _id: string;
}

export interface ExpandedEventFieldsObject {
  agent?: {
    id: string[];
  };
  kibana: {
    alert?: {
      rule?: {
        parameters: RuleParameters;
        name: string[];
      };
    };
  };
}

type RuleParameters = Array<{
  response_actions: Array<{
    action_type_id: RESPONSE_ACTION_TYPES;
    params: Record<string, unknown>;
  }>;
}>;
