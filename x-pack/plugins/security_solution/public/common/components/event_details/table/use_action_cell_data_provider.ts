/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeDataProviderId } from '@kbn/securitysolution-t-grid';
import { isArray, isEmpty, isString } from 'lodash/fp';
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
import { PORT_NAMES } from '../../../../network/components/port';
import { INDICATOR_REFERENCE } from '../../../../../common/cti/constants';
import { BrowserField } from '../../../containers/source';

export interface UseActionCellDataProvider {
  contextId?: string;
  eventId?: string;
  field: string;
  fieldFormat?: string;
  fieldFromBrowserField: Readonly<Record<string, Partial<BrowserField>>>;
  fieldType?: string;
  isObjectArray?: boolean;
  linkValue?: string | null;
  values: string[] | null | undefined;
}

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
}: UseActionCellDataProvider): { idList: string[]; stringValues: string[] } | null => {
  if (values === null || values === undefined) return null;

  const stringifiedValues: string[] = [];

  const idList: string[] = values
    .map((value, index) => {
      // if (fieldFromBrowserField) return '';
      let id = null;
      let valueAsString: string = isString(value) ? value : `${values}`;
      const appendedUniqueId = `${contextId}-${eventId}-${field}-${index}-${value}-${eventId}-${field}-${value}`;
      if (isObjectArray || fieldType === GEO_FIELD_TYPE || [MESSAGE_FIELD_NAME].includes(field)) {
        stringifiedValues.push(valueAsString);
        return '';
      } else if (fieldType === IP_FIELD_TYPE) {
        id = `formatted-ip-data-provider-${contextId}-${field}-${value}-${eventId}`;
        if (isString(value) && !isEmpty(value)) {
          try {
            const addresses = JSON.parse(value);
            if (isArray(addresses)) {
              valueAsString = addresses.join(',');
            }
          } catch (_) {
            // Default to keeping the existing string value
          }
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
      stringifiedValues.push(valueAsString);
      return escapeDataProviderId(id);
    })
    .filter((id) => id !== '');

  return {
    idList,
    stringValues: stringifiedValues,
  };
};
