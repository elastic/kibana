/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeDataProviderId } from '@kbn/securitysolution-t-grid';
import { isArray, isString, isEmpty } from 'lodash/fp';
import { INDICATOR_REFERENCE } from '../../../common/cti/constants';
import type { DataProvider } from '../../../common/types';
import { IS_OPERATOR } from '../../../common/types';
import type { BrowserField } from '../../common/containers/source';
import { IP_FIELD_TYPE } from '../../explore/network/components/ip';
import { PORT_NAMES } from '../../explore/network/components/port/helpers';
import { EVENT_DURATION_FIELD_NAME } from '../../timelines/components/duration';
import { BYTES_FORMAT } from '../../timelines/components/timeline/body/renderers/bytes';
import {
  GEO_FIELD_TYPE,
  MESSAGE_FIELD_NAME,
  HOST_NAME_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
  EVENT_MODULE_FIELD_NAME,
  SIGNAL_STATUS_FIELD_NAME,
  AGENT_STATUS_FIELD_NAME,
  RULE_REFERENCE_FIELD_NAME,
  REFERENCE_URL_FIELD_NAME,
  EVENT_URL_FIELD_NAME,
} from '../../timelines/components/timeline/body/renderers/constants';

export const getDataProvider = (field: string, id: string, value: string): DataProvider => ({
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

export interface CreateDataProviderParams {
  contextId?: string;
  eventId?: string;
  field?: string;
  fieldFormat?: string;
  fieldFromBrowserField?: BrowserField;
  fieldType?: string;
  isObjectArray?: boolean;
  linkValue?: string | null;
  values: string | string[] | null | undefined;
}

export const createDataProviders = ({
  contextId,
  eventId,
  field,
  fieldFormat,
  fieldType,
  linkValue,
  values,
}: CreateDataProviderParams) => {
  if (field == null || values === null || values === undefined) return null;
  const arrayValues = Array.isArray(values) ? values : [values];
  return arrayValues.reduce<DataProvider[]>((dataProviders, value, index) => {
    let id: string = '';
    const appendedUniqueId = `${contextId}${
      eventId ? `-${eventId}` : ''
    }-${field}-${index}-${value}`;

    if (fieldType === GEO_FIELD_TYPE || field === MESSAGE_FIELD_NAME) {
      return dataProviders;
    } else if (fieldType === IP_FIELD_TYPE) {
      id = `formatted-ip-data-provider-${contextId}-${field}-${value}${
        eventId ? `-${eventId}` : ''
      }`;
      if (isString(value) && !isEmpty(value)) {
        let addresses = value;
        try {
          addresses = JSON.parse(value);
        } catch (_) {
          // Default to keeping the existing string value
        }
        if (isArray(addresses)) {
          addresses.forEach((ip) => dataProviders.push(getDataProvider(field, id, ip)));
        } else {
          dataProviders.push(getDataProvider(field, id, addresses));
        }
        return dataProviders;
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
      id = `event-details-value-default-draggable-${appendedUniqueId}`;
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
    dataProviders.push(getDataProvider(field, id, value));
    return dataProviders;
  }, []);
};
