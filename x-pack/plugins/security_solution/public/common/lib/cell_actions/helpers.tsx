/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as i18n from './translations';
import {
  EVENT_URL_FIELD_NAME,
  HOST_NAME_FIELD_NAME,
  REFERENCE_URL_FIELD_NAME,
  RULE_REFERENCE_FIELD_NAME,
  USER_NAME_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { INDICATOR_REFERENCE } from '../../../../common/cti/constants';
import { IP_FIELD_TYPE } from '../../../explore/network/components/ip';
import { PORT_NAMES } from '../../../explore/network/components/port/helpers';
import { useKibana } from '../kibana';

export const COLUMNS_WITH_LINKS = [
  {
    columnId: HOST_NAME_FIELD_NAME,
    label: i18n.VIEW_HOST_SUMMARY,
  },
  {
    columnId: 'source.ip',
    fieldType: IP_FIELD_TYPE,
    label: i18n.EXPAND_IP_DETAILS,
  },
  {
    columnId: 'destination.ip',
    fieldType: IP_FIELD_TYPE,
    label: i18n.EXPAND_IP_DETAILS,
  },
  {
    columnId: 'signal.rule.name',
    label: i18n.VIEW_RULE_DETAILS,
    linkField: 'signal.rule.id',
  },
  ...PORT_NAMES.map((p) => ({
    columnId: p,
    label: i18n.VIEW_PORT_DETAILS,
  })),
  {
    columnId: RULE_REFERENCE_FIELD_NAME,
    label: i18n.VIEW_RULE_REFERENCE,
  },
  {
    columnId: REFERENCE_URL_FIELD_NAME,
    label: i18n.VIEW_RULE_REFERENCE,
  },
  {
    columnId: EVENT_URL_FIELD_NAME,
    label: i18n.VIEW_EVENT_REFERENCE,
  },
  {
    columnId: INDICATOR_REFERENCE,
    label: i18n.VIEW_INDICATOR_REFERENCE,
  },
  {
    columnId: USER_NAME_FIELD_NAME,
    label: i18n.VIEW_USER_SUMMARY,
  },
];

export const getLinkColumnDefinition = (
  columnIdToFind: string,
  fieldType?: string,
  linkField?: string
) =>
  COLUMNS_WITH_LINKS.find((column) => {
    if (column.columnId === columnIdToFind) {
      return true;
    } else if (
      column.fieldType &&
      fieldType === column.fieldType &&
      (linkField !== undefined || column.linkField !== undefined)
    ) {
      return true;
    } else {
      return false;
    }
  });

/** a noop required by the filter in / out buttons */
export const onFilterAdded = () => {};

/** a hook to eliminate the verbose boilerplate required to use common services */
export const useKibanaServices = () => {
  const {
    timelines,
    data: {
      query: { filterManager },
    },
  } = useKibana().services;

  return { timelines, filterManager };
};

export const EmptyComponent = () => <></>;
