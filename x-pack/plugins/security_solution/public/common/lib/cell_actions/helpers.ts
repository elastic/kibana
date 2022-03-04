/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';
import {
  EVENT_URL_FIELD_NAME,
  HOST_NAME_FIELD_NAME,
  REFERENCE_URL_FIELD_NAME,
  RULE_REFERENCE_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { INDICATOR_REFERENCE } from '../../../../common/cti/constants';
import { IP_FIELD_TYPE } from '../../../network/components/ip';
import { PORT_NAMES } from '../../../network/components/port/helpers';

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
    columnId: SIGNAL_RULE_NAME_FIELD_NAME,
    label: i18n.VIEW_RULE_DETAILS,
    linkField: 'kibana.alert.rule.uuid',
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
];

export const getLinkColumnDefinition = (
  columnIdToFind: string,
  fieldType?: string,
  linkField?: string,
  usersEnabled?: boolean
) => {
  // TOOD move user name field to COLUMNS_WITH_LINKS when experiment is finished
  return (
    usersEnabled
      ? [
          ...COLUMNS_WITH_LINKS,
          {
            columnId: USER_NAME_FIELD_NAME,
            label: i18n.VIEW_USER_SUMMARY,
          },
        ]
      : COLUMNS_WITH_LINKS
  ).find((column) => {
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
};
