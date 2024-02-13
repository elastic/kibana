/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type React from 'react';
import type { BrowserField, ColumnHeaderOptions, TimelineItem } from '@kbn/timelines-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';

import { INDICATOR_REFERENCE } from '../../../../../../common/cti/constants';
import { BYTES_FORMAT } from './bytes';
import { EVENT_DURATION_FIELD_NAME } from '../../../duration';
import { PORT_NAMES } from '../../../../../explore/network/components/port/helpers';
import {
  HOST_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
  IP_FIELD_TYPE,
  MESSAGE_FIELD_NAME,
  EVENT_MODULE_FIELD_NAME,
  RULE_REFERENCE_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
  REFERENCE_URL_FIELD_NAME,
  EVENT_URL_FIELD_NAME,
  SIGNAL_STATUS_FIELD_NAME,
  AGENT_STATUS_FIELD_NAME,
  GEO_FIELD_TYPE,
} from './constants';
import { FieldValueCell } from '../../../../../common/lib/cell_actions/field_value';

// simple black-list to prevent dragging and dropping fields such as message name
const columnNamesNotDraggable = [MESSAGE_FIELD_NAME];

// Used by the UnifiedDataTable

export const getFormattedFields = ({
  unifiedDataTableRows,
  headers,
  scopeId,
  closeCellPopover,
  browserFieldsByName,
}: {
  unifiedDataTableRows: Array<DataTableRecord & TimelineItem>;
  headers?: ColumnHeaderOptions[];
  scopeId: string;
  closeCellPopover?: () => void;
  browserFieldsByName: { [fieldName: string]: Partial<BrowserField> };
}) => {
  const ipFieldTypeFields =
    headers
      ?.filter((h) => browserFieldsByName[h.id] && browserFieldsByName[h.id].type === IP_FIELD_TYPE)
      .map((c) => c.id) ?? [];
  const geoFieldTypeFields =
    headers
      ?.filter(
        (h) => browserFieldsByName[h.id] && browserFieldsByName[h.id].type === GEO_FIELD_TYPE
      )
      .map((c) => c.id) ?? [];
  const byteFormattedFields =
    headers
      ?.filter(
        (h) => browserFieldsByName[h.id] && browserFieldsByName[h.id].format === BYTES_FORMAT
      )
      .map((c) => c.id) ?? [];
  return [
    ...PORT_NAMES,
    EVENT_DURATION_FIELD_NAME,
    HOST_NAME_FIELD_NAME,
    USER_NAME_FIELD_NAME,
    SIGNAL_RULE_NAME_FIELD_NAME,
    EVENT_MODULE_FIELD_NAME,
    SIGNAL_STATUS_FIELD_NAME,
    AGENT_STATUS_FIELD_NAME,
    RULE_REFERENCE_FIELD_NAME,
    REFERENCE_URL_FIELD_NAME,
    EVENT_URL_FIELD_NAME,
    INDICATOR_REFERENCE,
    ...ipFieldTypeFields,
    ...geoFieldTypeFields,
    ...byteFormattedFields,
    ...columnNamesNotDraggable,
  ].reduce(
    (
      obj: Record<string, (props: EuiDataGridCellValueElementProps) => React.ReactNode>,
      field: string
    ) => {
      obj[field] = FieldValueCell({
        data: [],
        ecsData: [],
        pageSize: 0,
        unifiedDataTableRows,
        scopeId,
        browserFieldsByName,
        closeCellPopover,
      });
      return obj;
    },
    {}
  );
};
