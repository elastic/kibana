/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr, find, isEmpty, uniqBy } from 'lodash/fp';
import { ALERT_RULE_NAMESPACE } from '@kbn/rule-data-utils';

import * as i18n from './translations';
import { BrowserFields } from '../../../../common/search_strategy/index_fields';
import {
  ALERTS_HEADERS_THRESHOLD_CARDINALITY,
  ALERTS_HEADERS_THRESHOLD_COUNT,
  ALERTS_HEADERS_THRESHOLD_TERMS,
  ALERTS_HEADERS_RULE_NAME,
  ALERTS_HEADERS_TARGET_IMPORT_HASH,
  ALERTS_HEADERS_RULE_DESCRIPTION,
} from '../../../detections/components/alerts_table/translations';
import { ALERT_THRESHOLD_RESULT } from '../../../../common/field_maps/field_names';
import { AGENT_STATUS_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { getEnrichedFieldInfo, SummaryRow } from './helpers';
import { EventSummaryField } from './types';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';

import { isAlertFromEndpointEvent } from '../../utils/endpoint_alert_check';
import { EventCode, EventCategory } from '../../../../common/ecs/event';

/** Always show these fields */
const alwaysDisplayedFields: EventSummaryField[] = [
  { id: 'host.name' },
  { id: 'agent.id', overrideField: AGENT_STATUS_FIELD_NAME, label: i18n.AGENT_STATUS },
  { id: 'user.name' },
  { id: 'rule.name', label: ALERTS_HEADERS_RULE_NAME },
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
        { id: 'process.name' },
      ];
    case EventCategory.DNS:
      return [{ id: 'dns.query.name' }, { id: 'process.name' }];
    case EventCategory.REGISTRY:
      return [{ id: 'registry.key' }, { id: 'registry.value' }, { id: 'process.name' }];
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
          id: 'Target.process.thread.Ext.start_address_detaiuls.memory_pe.imphash',
          label: ALERTS_HEADERS_TARGET_IMPORT_HASH,
        },
        {
          id: 'Memory_protection.unique_key_v1',
        },
      ];
    case EventCode.MEMORY_SIGNATURE:
    case EventCode.RANSOMWARE:
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
        { id: `${ALERT_THRESHOLD_RESULT}.count`, label: ALERTS_HEADERS_THRESHOLD_COUNT },
        { id: `${ALERT_THRESHOLD_RESULT}.terms`, label: ALERTS_HEADERS_THRESHOLD_TERMS },
        {
          id: `${ALERT_THRESHOLD_RESULT}.cardinality`,
          label: ALERTS_HEADERS_THRESHOLD_CARDINALITY,
        },
      ];
    case 'machine_learning':
      return [
        {
          id: `${ALERT_RULE_NAMESPACE}.machine_learning_job_id`,
        },
        {
          id: `${ALERT_RULE_NAMESPACE}.anomaly_threshold`,
        },
      ];
    case 'threat_match':
      return [
        {
          id: `${ALERT_RULE_NAMESPACE}.threat_index`,
        },
        {
          id: `${ALERT_RULE_NAMESPACE}.index`,
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

  const eventRuleTypeField = find({ category: 'kibana', field: 'kibana.rule.type' }, data);
  const eventRuleType = Array.isArray(eventRuleTypeField?.originalValue)
    ? eventRuleTypeField?.originalValue?.[0]
    : eventRuleTypeField?.originalValue;

  const tableFields = getEventFieldsToDisplay({
    eventCategories,
    eventCode,
    eventRuleType,
  });

  return data != null
    ? tableFields.reduce<SummaryRow[]>((acc, field) => {
        const item = data.find((d) => d.field === field.id);
        if (!item || isEmpty(item?.values)) {
          return acc;
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

        if (field.id === `${ALERT_THRESHOLD_RESULT}.terms`) {
          try {
            const terms = getOr(null, 'originalValue', item);
            const parsedValue = terms.map((term: string) => JSON.parse(term));
            const thresholdTerms = (parsedValue ?? []).map(
              (entry: { field: string; value: string }) => {
                return {
                  title: `${entry.field} [threshold]`,
                  description: {
                    ...description,
                    values: [entry.value],
                  },
                };
              }
            );
            return [...acc, ...thresholdTerms];
          } catch (err) {
            return [...acc];
          }
        }

        if (field.id === `${ALERT_THRESHOLD_RESULT}.cardinality`) {
          try {
            const value = getOr(null, 'originalValue.0', field);
            const parsedValue = JSON.parse(value);
            return [
              ...acc,
              {
                title: ALERTS_HEADERS_THRESHOLD_CARDINALITY,
                description: {
                  ...description,
                  values: [`count(${parsedValue.field}) == ${parsedValue.value}`],
                },
              },
            ];
          } catch (err) {
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
