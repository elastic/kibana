/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr, find, isEmpty, uniqBy } from 'lodash/fp';

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
import { AGENT_STATUS_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { getEnrichedFieldInfo, SummaryRow } from './helpers';
import { EventSummaryField } from './types';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';

import { isAlertFromEndpointEvent } from '../../utils/endpoint_alert_check';
import { EventCode, EventCategory } from '../../../../common/ecs/event';

const defaultDisplayFields: EventSummaryField[] = [
  { id: 'host.name' },
  { id: 'agent.id', overrideField: AGENT_STATUS_FIELD_NAME, label: i18n.AGENT_STATUS },
  { id: 'user.name' },
  { id: 'rule.name', label: ALERTS_HEADERS_RULE_NAME },
];

function getFieldsByCategory(eventCategory?: string): EventSummaryField[] {
  switch (eventCategory) {
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
      return [];
  }
}

function getFieldsByEventCode(eventCode?: string): EventSummaryField[] {
  switch (eventCode) {
    case EventCode.BEHAVIOR:
      return [{ id: 'rule.description', label: ALERTS_HEADERS_RULE_DESCRIPTION }];
    case EventCode.SHELLCODE_THREAD:
      return [
        { id: 'Target.process.executable' },
        { id: 'Source.process.executable' },
        {
          id: 'Target.process.thread.Ext.start_address_details.memory_pe.imphash',
          label: ALERTS_HEADERS_TARGET_IMPORT_HASH,
        },
      ];
    case EventCode.MEMORY_SIGNATURE:
      return [{ id: 'process.Ext.memory_region.malware_signature.all_names' }];
    case EventCode.MALICIOUS_FILE:
      return getFieldsByCategory(EventCategory.FILE);
    case EventCode.RANSOMWARE:
      return getFieldsByCategory(EventCategory.PROCESS);
    default:
      return [];
  }
}

function getFieldsByRuleType(ruleType?: string): EventSummaryField[] {
  switch (ruleType) {
    case 'threshold':
      return [
        { id: 'kibana.alert.threshold_result.count', label: ALERTS_HEADERS_THRESHOLD_COUNT },
        { id: 'kibana.alert.threshold_result.terms', label: ALERTS_HEADERS_THRESHOLD_TERMS },
        {
          id: 'kibana.alert.threshold_result.cardinality',
          label: ALERTS_HEADERS_THRESHOLD_CARDINALITY,
        },
      ];
    case 'machine_learning':
      return [
        {
          id: 'kibana.alert.rule.machine_learning_job_id',
        },
        {
          id: 'kibana.alert.rule.anomaly_threshold',
        },
      ];
    case 'threat_match':
      return [
        {
          id: 'kibana.alert.rule.threat_index',
        },
        {
          id: 'kibana.alert.rule.index',
        },
      ];
    default:
      return [];
  }
}

function getEventFieldsToDisplay({
  eventCategory,
  eventCode,
  eventRuleType,
}: {
  eventCategory?: string;
  eventCode?: string;
  eventRuleType?: string;
}): EventSummaryField[] {
  return uniqBy('id', [
    ...defaultDisplayFields,
    ...getFieldsByCategory(eventCategory),
    ...getFieldsByEventCode(eventCode),
    ...getFieldsByRuleType(eventRuleType),
  ]);
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
  const eventCategoryField = find({ category: 'event', field: 'event.category' }, data);

  const eventCategory = Array.isArray(eventCategoryField?.originalValue)
    ? eventCategoryField?.originalValue[0]
    : eventCategoryField?.originalValue;

  const eventCodeField = find({ category: 'event', field: 'event.code' }, data);

  const eventCode = Array.isArray(eventCodeField?.originalValue)
    ? eventCodeField?.originalValue?.[0]
    : eventCodeField?.originalValue;

  const eventRuleTypeField = find({ category: 'kibana', field: 'kibana.rule.type' }, data);
  const eventRuleType = Array.isArray(eventRuleTypeField?.originalValue)
    ? eventRuleTypeField?.originalValue?.[0]
    : eventRuleTypeField?.originalValue;

  const tableFields = getEventFieldsToDisplay({ eventCategory, eventCode, eventRuleType });

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

        if (field.id === 'kibana.alert.threshold_result.terms') {
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

        if (field.id === 'kibana.alert.threshold_result.cardinality') {
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
