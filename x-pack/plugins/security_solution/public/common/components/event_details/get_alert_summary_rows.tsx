/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr, find, isEmpty } from 'lodash/fp';

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
import {
  AGENT_STATUS_FIELD_NAME,
  IP_FIELD_TYPE,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { DESTINATION_IP_FIELD_NAME, SOURCE_IP_FIELD_NAME } from '../../../network/components/ip';
import { getEnrichedFieldInfo, SummaryRow } from './helpers';
import { EventSummaryField } from './types';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';

import { isAlertFromEndpointEvent } from '../../utils/endpoint_alert_check';
import { EventCode } from '../../../../common/ecs/event';

const defaultDisplayFields: EventSummaryField[] = [
  { id: 'host.name' },
  { id: 'agent.id', overrideField: AGENT_STATUS_FIELD_NAME, label: i18n.AGENT_STATUS },
  { id: 'user.name' },
  { id: SOURCE_IP_FIELD_NAME, fieldType: IP_FIELD_TYPE },
  { id: DESTINATION_IP_FIELD_NAME, fieldType: IP_FIELD_TYPE },
  { id: 'kibana.alert.threshold_result.count', label: ALERTS_HEADERS_THRESHOLD_COUNT },
  { id: 'kibana.alert.threshold_result.terms', label: ALERTS_HEADERS_THRESHOLD_TERMS },
  { id: 'kibana.alert.threshold_result.cardinality', label: ALERTS_HEADERS_THRESHOLD_CARDINALITY },
];

const processCategoryFields: EventSummaryField[] = [
  ...defaultDisplayFields,
  { id: 'process.name' },
  { id: 'process.parent.name' },
  { id: 'process.args' },
];

const networkCategoryFields: EventSummaryField[] = [
  ...defaultDisplayFields,
  { id: 'destination.address' },
  { id: 'destination.port' },
  { id: 'process.name' },
];

const memoryShellCodeAlertFields: EventSummaryField[] = [
  ...defaultDisplayFields,
  { id: 'rule.name', label: ALERTS_HEADERS_RULE_NAME },
  {
    id: 'Target.process.thread.Ext.start_address_details.memory_pe.imphash',
    label: ALERTS_HEADERS_TARGET_IMPORT_HASH,
  },
];

const behaviorAlertFields: EventSummaryField[] = [
  ...defaultDisplayFields,
  { id: 'rule.description', label: ALERTS_HEADERS_RULE_DESCRIPTION },
];

const memorySignatureAlertFields: EventSummaryField[] = [
  ...defaultDisplayFields,
  { id: 'rule.name', label: ALERTS_HEADERS_RULE_NAME },
];

function getEventFieldsToDisplay({
  eventCategory,
  eventCode,
}: {
  eventCategory: string;
  eventCode?: string;
}): EventSummaryField[] {
  switch (eventCode) {
    // memory protection fields
    case EventCode.SHELLCODE_THREAD:
      return memoryShellCodeAlertFields;
    case EventCode.MEMORY_SIGNATURE:
      return memorySignatureAlertFields;
    case EventCode.BEHAVIOR:
      return behaviorAlertFields;
  }

  switch (eventCategory) {
    case 'network':
      return networkCategoryFields;

    case 'process':
      return processCategoryFields;
  }

  return defaultDisplayFields;
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

  const tableFields = getEventFieldsToDisplay({ eventCategory, eventCode });

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
