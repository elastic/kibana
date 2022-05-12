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
import { PORT_NAMES } from '../../../../network/components/port/helpers';
import { INDICATOR_REFERENCE } from '../../../../../common/cti/constants';
import { BrowserField } from '../../../containers/source';
import { DataProvider, IS_OPERATOR } from '../../../../../common/types';

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

const getDataProvider = (field: string, id: string, value: string): DataProvider => ({
  and: [],
  enabled: true,
  id: escapeDataProviderId(id),
  name: field,
  excluded: false,
  kqlQuery: '',
  queryMatch: {
    field,
    value,
    operator: IS_OPERATOR,
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
}: UseActionCellDataProvider): {
  stringValues: string[];
  dataProvider: DataProvider[];
} | null => {
  const cellData = useMemo(() => {
    if (values === null || values === undefined) return null;
    const arrayValues = Array.isArray(values) ? values : [values];
    return arrayValues.reduce<{
      stringValues: string[];
      dataProvider: DataProvider[];
    }>(
      (memo, value, index) => {
        let id: string = '';
        let valueAsString: string = isString(value) ? value : `${values}`;
        const appendedUniqueId = `${contextId}-${eventId}-${field}-${index}-${value}`;
        if (fieldFromBrowserField == null) {
          memo.stringValues.push(valueAsString);
          return memo;
        }

        if (isObjectArray || fieldType === GEO_FIELD_TYPE || [MESSAGE_FIELD_NAME].includes(field)) {
          memo.stringValues.push(valueAsString);
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
              addresses.forEach((ip) => memo.dataProvider.push(getDataProvider(field, id, ip)));
            }
            memo.dataProvider.push(getDataProvider(field, id, addresses));
            memo.stringValues.push(valueAsString);
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
        memo.stringValues.push(valueAsString);
        memo.dataProvider.push(getDataProvider(field, id, value));
        return memo;
      },
      { stringValues: [], dataProvider: [] }
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
