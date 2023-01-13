/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import { escapeDataProviderId } from '@kbn/securitysolution-t-grid';
import { isArray, isEmpty, isString } from 'lodash/fp';
import { useMemo } from 'react';
import {
  AGENT_STATUS_FIELD_NAME,
  EVENT_MODULE_FIELD_NAME,
  EVENT_URL_FIELD_NAME,
  GEO_FIELD_TYPE,
  HOST_NAME_FIELD_NAME,
  IP_FIELD_TYPE,
  MESSAGE_FIELD_NAME,
  REFERENCE_URL_FIELD_NAME,
  RULE_REFERENCE_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
  SIGNAL_STATUS_FIELD_NAME,
} from '../../../../timelines/components/timeline/body/renderers/constants';
import { BYTES_FORMAT } from '../../../../timelines/components/timeline/body/renderers/bytes';
import { EVENT_DURATION_FIELD_NAME } from '../../../../timelines/components/duration';
import { getDisplayValue } from '../../../../timelines/components/timeline/data_providers/helpers';
import { PORT_NAMES } from '../../../../explore/network/components/port/helpers';
import { INDICATOR_REFERENCE } from '../../../../../common/cti/constants';
import type { BrowserField } from '../../../containers/source';
import type { DataProvider, QueryOperator } from '../../../../../common/types';
import { IS_OPERATOR } from '../../../../../common/types';

export interface UseActionCellDataProvider {
  contextId?: string;
  eventId?: string;
  field: string;
  fieldFormat?: string;
  fieldFromBrowserField?: BrowserField;
  fieldType?: string;
  isObjectArray?: boolean;
  linkValue?: string | null;
  values: string[] | null | undefined;
}

export interface ActionCellValuesAndDataProvider {
  values: string[];
  dataProviders: DataProvider[];
}

export const getDataProvider = (
  field: string,
  id: string,
  value: string | string[],
  operator: QueryOperator = IS_OPERATOR
): DataProvider => ({
  and: [],
  enabled: true,
  id: escapeDataProviderId(id),
  name: field,
  excluded: false,
  kqlQuery: '',
  queryMatch: {
    field,
    value,
    operator,
    displayValue: getDisplayValue(value),
  },
});

export const useActionCellDataProvider = ({
  contextId,
  eventId,
  field,
  fieldFormat,
  fieldFromBrowserField,
  fieldType,
  isObjectArray,
  linkValue,
  values,
}: UseActionCellDataProvider): ActionCellValuesAndDataProvider | null => {
  const cellData = useMemo(() => {
    if (values === null || values === undefined) return null;
    const arrayValues = Array.isArray(values) ? values : [values];
    return arrayValues.reduce<ActionCellValuesAndDataProvider>(
      (memo, value, index) => {
        let id: string = '';
        let valueAsString: string = isString(value) ? value : `${values}`;
        const appendedUniqueId = `${contextId}-${eventId}-${field}-${index}-${value}`;
        if (fieldFromBrowserField == null) {
          memo.values.push(valueAsString);
          return memo;
        }

        if (isObjectArray || fieldType === GEO_FIELD_TYPE || [MESSAGE_FIELD_NAME].includes(field)) {
          memo.values.push(valueAsString);
          return memo;
        } else if (fieldType === IP_FIELD_TYPE) {
          id = `formatted-ip-data-provider-${contextId}-${field}-${value}-${eventId}`;
          if (isString(value) && !isEmpty(value)) {
            let addresses = value;
            try {
              addresses = JSON.parse(value);
            } catch (_) {
              // Default to keeping the existing string value
            }
            if (isArray(addresses)) {
              valueAsString = addresses.join(',');
              addresses.forEach((ip) => memo.dataProviders.push(getDataProvider(field, id, ip)));
            }
            memo.dataProviders.push(getDataProvider(field, id, addresses));
            memo.values.push(valueAsString);
            return memo;
          }
        } else if (PORT_NAMES.some((portName) => field === portName)) {
          id = `port-default-draggable-${appendedUniqueId}`;
        } else if (field === EVENT_DURATION_FIELD_NAME) {
          id = `duration-default-draggable-${appendedUniqueId}`;
        } else if (field === HOST_NAME_FIELD_NAME) {
          id = `event-details-value-default-draggable-${appendedUniqueId}`;
        } else if (fieldFormat === BYTES_FORMAT) {
          id = `bytes-default-draggable-${appendedUniqueId}`;
        } else if (field === SIGNAL_RULE_NAME_FIELD_NAME) {
          id = `event-details-value-default-draggable-${appendedUniqueId}-${linkValue}`;
        } else if (field === EVENT_MODULE_FIELD_NAME) {
          id = `event-details-value-default-draggable-${appendedUniqueId}-${value}`;
        } else if (field === SIGNAL_STATUS_FIELD_NAME) {
          id = `alert-details-value-default-draggable-${appendedUniqueId}`;
        } else if (field === AGENT_STATUS_FIELD_NAME) {
          const valueToUse = typeof value === 'string' ? value : '';
          id = `event-details-value-default-draggable-${appendedUniqueId}`;
          valueAsString = valueToUse;
        } else if (
          [
            RULE_REFERENCE_FIELD_NAME,
            REFERENCE_URL_FIELD_NAME,
            EVENT_URL_FIELD_NAME,
            INDICATOR_REFERENCE,
          ].includes(field)
        ) {
          id = `event-details-value-default-draggable-${appendedUniqueId}-${value}`;
        } else {
          id = `event-details-value-default-draggable-${appendedUniqueId}`;
        }
        memo.values.push(valueAsString);
        memo.dataProviders.push(getDataProvider(field, id, value));
        return memo;
      },
      { values: [], dataProviders: [] }
    );
  }, [
    contextId,
    eventId,
    field,
    fieldFormat,
    fieldFromBrowserField,
    fieldType,
    isObjectArray,
    linkValue,
    values,
  ]);
  return cellData;
};
