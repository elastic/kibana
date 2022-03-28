/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, isEmpty, uniqBy } from 'lodash/fp';
import { ALERT_RULE_PARAMETERS, ALERT_RULE_TYPE } from '@kbn/rule-data-utils';

import * as i18n from './translations';
import { BrowserFields } from '../../../../common/search_strategy/index_fields';
import {
  ALERTS_HEADERS_THRESHOLD_CARDINALITY,
  ALERTS_HEADERS_THRESHOLD_COUNT,
  ALERTS_HEADERS_THRESHOLD_TERMS,
  ALERTS_HEADERS_RULE_DESCRIPTION,
} from '../../../detections/components/alerts_table/translations';
import { ALERT_THRESHOLD_RESULT } from '../../../../common/field_maps/field_names';
import { AGENT_STATUS_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { getEnrichedFieldInfo, AlertSummaryRow } from './helpers';
import { EventSummaryField, EnrichedFieldInfo } from './types';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';

import { isAlertFromEndpointEvent } from '../../utils/endpoint_alert_check';
import { EventCode, EventCategory } from '../../../../common/ecs/event';

const THRESHOLD_TERMS_FIELD = `${ALERT_THRESHOLD_RESULT}.terms.field`;
const THRESHOLD_TERMS_VALUE = `${ALERT_THRESHOLD_RESULT}.terms.value`;
const THRESHOLD_CARDINALITY_FIELD = `${ALERT_THRESHOLD_RESULT}.cardinality.field`;
const THRESHOLD_CARDINALITY_VALUE = `${ALERT_THRESHOLD_RESULT}.cardinality.value`;
const THRESHOLD_COUNT = `${ALERT_THRESHOLD_RESULT}.count`;

/** Always show these fields */
const alwaysDisplayedFields: EventSummaryField[] = [
  { id: 'host.name' },
  { id: 'agent.id', overrideField: AGENT_STATUS_FIELD_NAME, label: i18n.AGENT_STATUS },
  { id: 'user.name' },
  { id: ALERT_RULE_TYPE, label: i18n.RULE_TYPE },
  { id: 'kibana.alert.original_event.id', label: i18n.SOURCE_EVENT_ID },
];

/**
 * Get a list of fields to display based on the event's category
 */
function getFieldsByCategory({
  primaryEventCategory,
  allEventCategories,
}: EventCategories): EventSummaryField[] {
  switch (primaryEventCategory) {
    case EventCategory.PROCESS:
      return [{ id: 'process.name' }, { id: 'process.parent.name' }, { id: 'process.args' }];
    case EventCategory.FILE:
      return [
        { id: 'file.name' },
        { id: 'file.hash.sha256' },
        { id: 'file.directory' },
        { id: 'process.name' },
      ];
    case EventCategory.NETWORK:
      return [
        { id: 'destination.address' },
        { id: 'destination.port' },
        { id: 'source.address' },
        { id: 'source.port' },
        { id: 'dns.question.name' },
        { id: 'process.name' },
      ];
    case EventCategory.REGISTRY:
      return [{ id: 'registry.key' }, { id: 'registry.value' }, { id: 'process.name' }];
    case EventCategory.MALWARE:
      // The details for malware events can be found in the file fields
      return getFieldsByCategory({ primaryEventCategory: EventCategory.FILE, allEventCategories });
    default:
      let fields: EventSummaryField[] = [];

      // If no primary category matches or hasn't been defined on purpose (e.g. in order to follow the source event)
      // resolve more fields based on the other event categories.
      if (allEventCategories?.includes(EventCategory.FILE)) {
        fields = fields.concat(getFieldsByCategory({ primaryEventCategory: EventCategory.FILE }));
      }

      if (allEventCategories?.includes(EventCategory.PROCESS)) {
        fields = fields.concat(
          getFieldsByCategory({ primaryEventCategory: EventCategory.PROCESS })
        );
      }
      return fields;
  }
}

/**
 * Gets the fields to display based on the event's code.
 * Contains some enhancements to resolve more fields based on the event's categories.
 * @param eventCode The event's code
 * @param eventCategories The events categories
 * @returns A list of fields to include
 */
function getFieldsByEventCode(
  eventCode: string | undefined,
  eventCategories: EventCategories
): EventSummaryField[] {
  switch (eventCode) {
    case EventCode.BEHAVIOR:
      return [
        { id: 'rule.description', label: ALERTS_HEADERS_RULE_DESCRIPTION },
        // Resolve more fields based on the source event
        ...getFieldsByCategory({ ...eventCategories, primaryEventCategory: undefined }),
      ];
    case EventCode.SHELLCODE_THREAD:
      return [
        { id: 'Target.process.executable' },
        {
          id: 'Memory_protection.unique_key_v1',
        },
      ];
    case EventCode.RANSOMWARE:
      return [
        { id: 'Ransomware.feature' },
        { id: 'process.hash.sha256' },
        ...getFieldsByCategory({ ...eventCategories, primaryEventCategory: undefined }),
      ];
    case EventCode.MEMORY_SIGNATURE:
      // Resolve more fields based on the source event
      return getFieldsByCategory({ ...eventCategories, primaryEventCategory: undefined });
    default:
      return [];
  }
}

/**
 * Returns a list of fields based on the event's rule type
 */
function getFieldsByRuleType(ruleType?: string): EventSummaryField[] {
  switch (ruleType) {
    case 'threshold':
      return [
        { id: THRESHOLD_COUNT, label: ALERTS_HEADERS_THRESHOLD_COUNT },
        { id: THRESHOLD_TERMS_FIELD, label: ALERTS_HEADERS_THRESHOLD_TERMS },
        {
          id: THRESHOLD_CARDINALITY_FIELD,
          label: ALERTS_HEADERS_THRESHOLD_CARDINALITY,
        },
      ];
    case 'machine_learning':
      return [
        {
          id: `${ALERT_RULE_PARAMETERS}.machine_learning_job_id`,
          legacyId: 'signal.rule.machine_learning_job_id',
        },
        {
          id: `${ALERT_RULE_PARAMETERS}.anomaly_threshold`,
          legacyId: 'signal.rule.anomaly_threshold',
        },
      ];
    case 'threat_match':
      return [
        {
          id: `${ALERT_RULE_PARAMETERS}.threat_index`,
          legacyId: 'signal.rule.threat_index',
        },
        {
          id: `${ALERT_RULE_PARAMETERS}.threat_query`,
          legacyId: 'signal.rule.threat_query',
        },
      ];
    default:
      return [];
  }
}

/**
 * Assembles a list of fields to display based on the event
 */
function getEventFieldsToDisplay({
  eventCategories,
  eventCode,
  eventRuleType,
}: {
  eventCategories: EventCategories;
  eventCode?: string;
  eventRuleType?: string;
}): EventSummaryField[] {
  const fields = [
    ...alwaysDisplayedFields,
    ...getFieldsByCategory(eventCategories),
    ...getFieldsByEventCode(eventCode, eventCategories),
    ...getFieldsByRuleType(eventRuleType),
  ];

  // Filter all fields by their id to make sure there are no duplicates
  return uniqBy('id', fields);
}

interface EventCategories {
  primaryEventCategory?: string;
  allEventCategories?: string[];
}

/**
 * Extract the event's categories
 * @param data The event details
 * @returns The event's primary category and all other categories in case there is more than one
 */
function getEventCategoriesFromData(data: TimelineEventsDetailsItem[]): EventCategories {
  const eventCategoryField = find({ category: 'event', field: 'event.category' }, data);

  let primaryEventCategory: string | undefined;
  let allEventCategories: string[] | undefined;

  if (Array.isArray(eventCategoryField?.originalValue)) {
    primaryEventCategory = eventCategoryField?.originalValue[0];
    allEventCategories = eventCategoryField?.originalValue;
  } else {
    primaryEventCategory = eventCategoryField?.originalValue;
    if (primaryEventCategory) {
      allEventCategories = [primaryEventCategory];
    }
  }

  return { primaryEventCategory, allEventCategories };
}

export const getSummaryRows = ({
  data,
  browserFields,
  timelineId,
  eventId,
  isDraggable = false,
}: {
  data: TimelineEventsDetailsItem[];
  browserFields: BrowserFields;
  timelineId: string;
  eventId: string;
  isDraggable?: boolean;
}) => {
  const eventCategories = getEventCategoriesFromData(data);

  const eventCodeField = find({ category: 'event', field: 'event.code' }, data);

  const eventCode = Array.isArray(eventCodeField?.originalValue)
    ? eventCodeField?.originalValue?.[0]
    : eventCodeField?.originalValue;

  const eventRuleTypeField = find({ category: 'kibana', field: ALERT_RULE_TYPE }, data);
  const eventRuleType = Array.isArray(eventRuleTypeField?.originalValue)
    ? eventRuleTypeField?.originalValue?.[0]
    : eventRuleTypeField?.originalValue;

  const tableFields = getEventFieldsToDisplay({
    eventCategories,
    eventCode,
    eventRuleType,
  });

  return data != null
    ? tableFields.reduce<AlertSummaryRow[]>((acc, field) => {
        const item = data.find(
          (d) => d.field === field.id || (field.legacyId && d.field === field.legacyId)
        );
        if (!item || isEmpty(item.values)) {
          return acc;
        }

        // If we found the data by its legacy id we swap the ids to display the correct one
        if (item.field === field.legacyId) {
          field.id = field.legacyId;
        }

        const linkValueField =
          field.linkField != null && data.find((d) => d.field === field.linkField);
        const description = {
          ...getEnrichedFieldInfo({
            item,
            linkValueField: linkValueField || undefined,
            contextId: timelineId,
            timelineId,
            browserFields,
            eventId,
            field,
          }),
          isDraggable,
        };

        if (field.id === 'agent.id' && !isAlertFromEndpointEvent({ data })) {
          return acc;
        }

        if (field.id === THRESHOLD_TERMS_FIELD) {
          const enrichedInfo = enrichThresholdTerms(item, data, description);
          if (enrichedInfo) {
            return [...acc, ...enrichedInfo];
          } else {
            return acc;
          }
        }

        if (field.id === THRESHOLD_CARDINALITY_FIELD) {
          const enrichedInfo = enrichThresholdCardinality(item, data, description);
          if (enrichedInfo) {
            return [...acc, enrichedInfo];
          } else {
            return acc;
          }
        }

        return [
          ...acc,
          {
            title: field.label ?? field.id,
            description,
          },
        ];
      }, [])
    : [];
};

/**
 * Enriches the summary data for threshold terms.
 * For any given threshold term, it generates a row with the term's name and the associated value.
 */
function enrichThresholdTerms(
  { values: termsFieldArr }: TimelineEventsDetailsItem,
  data: TimelineEventsDetailsItem[],
  description: EnrichedFieldInfo
) {
  const termsValueItem = data.find((d) => d.field === THRESHOLD_TERMS_VALUE);
  const termsValueArray = termsValueItem && termsValueItem.values;

  // Make sure both `fields` and `values` are an array and that they have the same length
  if (
    Array.isArray(termsFieldArr) &&
    termsFieldArr.length > 0 &&
    Array.isArray(termsValueArray) &&
    termsFieldArr.length === termsValueArray.length
  ) {
    return termsFieldArr.map((field, index) => {
      return {
        title: `${field} [threshold]`,
        description: {
          ...description,
          values: [termsValueArray[index]],
        },
      };
    });
  }
}

/**
 * Enriches the summary data for threshold cardinality.
 * Reads out the cardinality field and the value and interpolates them into a combined string value.
 */
function enrichThresholdCardinality(
  { values: cardinalityFieldArr }: TimelineEventsDetailsItem,
  data: TimelineEventsDetailsItem[],
  description: EnrichedFieldInfo
) {
  const cardinalityValueItem = data.find((d) => d.field === THRESHOLD_CARDINALITY_VALUE);
  const cardinalityValueArray = cardinalityValueItem && cardinalityValueItem.values;

  // Only return a summary row if we actually have the correct field and value
  if (
    Array.isArray(cardinalityFieldArr) &&
    cardinalityFieldArr.length === 1 &&
    Array.isArray(cardinalityValueArray) &&
    cardinalityFieldArr.length === cardinalityValueArray.length
  ) {
    return {
      title: ALERTS_HEADERS_THRESHOLD_CARDINALITY,
      description: {
        ...description,
        values: [`count(${cardinalityFieldArr[0]}) >= ${cardinalityValueArray[0]}`],
      },
    };
  }
}
