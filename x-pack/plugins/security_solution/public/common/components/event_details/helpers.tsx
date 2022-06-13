/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr, isEmpty, uniqBy } from 'lodash/fp';

import {
  elementOrChildrenHasFocus,
  getFocusedDataColindexCell,
  getTableSkipFocus,
  handleSkipFocus,
  stopPropagationAndPreventDefault,
} from '../../../../../timelines/public';
import { BrowserField, BrowserFields } from '../../containers/source';
import {
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
  DEFAULT_COLUMN_MIN_WIDTH,
} from '../../../timelines/components/timeline/body/constants';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import type { EnrichedFieldInfo, EventSummaryField } from './types';

import * as i18n from './translations';
import { ColumnHeaderOptions } from '../../../../common/types';

/**
 * Defines the behavior of the search input that appears above the table of data
 */
export const search = {
  box: {
    incremental: true,
    placeholder: i18n.PLACEHOLDER,
    schema: true,
  },
};

export interface ItemValues {
  value: JSX.Element;
  valueAsString: string;
}

/**
 * An item rendered in the table
 */
export interface Item {
  description: string;
  field: JSX.Element;
  fieldId: string;
  type: string;
  values: string[];
}

export interface AlertSummaryRow {
  title: string;
  description: EnrichedFieldInfo & {
    isDraggable?: boolean;
    isReadOnly?: boolean;
  };
}

export const getColumnHeaderFromBrowserField = ({
  browserField,
  width = DEFAULT_COLUMN_MIN_WIDTH,
}: {
  browserField: Partial<BrowserField>;
  width?: number;
}): ColumnHeaderOptions => ({
  category: browserField.category,
  columnHeaderType: 'not-filtered',
  description: browserField.description != null ? browserField.description : undefined,
  example: browserField.example != null ? `${browserField.example}` : undefined,
  id: browserField.name || '',
  type: browserField.type,
  aggregatable: browserField.aggregatable,
  initialWidth: width,
});

/**
 * Returns a collection of columns, where the first column in the collection
 * is a timestamp, and the remaining columns are all the columns in the
 * specified category
 */
export const getColumnsWithTimestamp = ({
  browserFields,
  category,
}: {
  browserFields: BrowserFields;
  category: string;
}): ColumnHeaderOptions[] => {
  const emptyFields: Record<string, Partial<BrowserField>> = {};
  const timestamp = get('base.fields.@timestamp', browserFields);
  const categoryFields: Array<Partial<BrowserField>> = [
    ...Object.values(getOr(emptyFields, `${category}.fields`, browserFields)),
  ];

  return timestamp != null && categoryFields.length
    ? uniqBy('id', [
        getColumnHeaderFromBrowserField({
          browserField: timestamp,
          width: DEFAULT_DATE_COLUMN_MIN_WIDTH,
        }),
        ...categoryFields.map((f) => getColumnHeaderFromBrowserField({ browserField: f })),
      ])
    : [];
};

/** Returns example text, or an empty string if the field does not have an example */
export const getExampleText = (example: string | number | null | undefined): string =>
  !isEmpty(example) ? `Example: ${example}` : '';

export const getIconFromType = (type: string | null | undefined) => {
  switch (type) {
    case 'string': // fall through
    case 'keyword':
      return 'string';
    case 'number': // fall through
    case 'long':
      return 'number';
    case 'date':
      return 'clock';
    case 'ip':
    case 'geo_point':
      return 'globe';
    case 'object':
      return 'questionInCircle';
    case 'float':
      return 'number';
    default:
      return 'questionInCircle';
  }
};

export const EVENT_FIELDS_TABLE_CLASS_NAME = 'event-fields-table';

/**
 * Returns `true` if the Event Details "event fields" table, or it's children,
 * has focus
 */
export const tableHasFocus = (containerElement: HTMLElement | null): boolean =>
  elementOrChildrenHasFocus(
    containerElement?.querySelector<HTMLDivElement>(`.${EVENT_FIELDS_TABLE_CLASS_NAME}`)
  );

/**
 * This function has a side effect. It will skip focus "after" or "before"
 * the Event Details table, with exceptions as noted below.
 *
 * If the currently-focused table cell has additional focusable children,
 * i.e. draggables or always-open popover content, the browser's "natural"
 * focus management will determine which element is focused next.
 */
export const onEventDetailsTabKeyPressed = ({
  containerElement,
  keyboardEvent,
  onSkipFocusBeforeEventsTable,
  onSkipFocusAfterEventsTable,
}: {
  containerElement: HTMLElement | null;
  keyboardEvent: React.KeyboardEvent;
  onSkipFocusBeforeEventsTable: () => void;
  onSkipFocusAfterEventsTable: () => void;
}) => {
  const { shiftKey } = keyboardEvent;

  const eventFieldsTableSkipFocus = getTableSkipFocus({
    containerElement,
    getFocusedCell: getFocusedDataColindexCell,
    shiftKey,
    tableHasFocus,
    tableClassName: EVENT_FIELDS_TABLE_CLASS_NAME,
  });

  if (eventFieldsTableSkipFocus !== 'SKIP_FOCUS_NOOP') {
    stopPropagationAndPreventDefault(keyboardEvent);
    handleSkipFocus({
      onSkipFocusBackwards: onSkipFocusBeforeEventsTable,
      onSkipFocusForward: onSkipFocusAfterEventsTable,
      skipFocus: eventFieldsTableSkipFocus,
    });
  }
};

export function getEnrichedFieldInfo({
  browserFields,
  contextId,
  eventId,
  field,
  item,
  linkValueField,
  timelineId,
}: {
  browserFields: BrowserFields;
  contextId: string;
  item: TimelineEventsDetailsItem;
  eventId: string;
  field?: EventSummaryField;
  timelineId: string;
  linkValueField?: TimelineEventsDetailsItem;
}): EnrichedFieldInfo {
  const fieldInfo = {
    contextId,
    eventId,
    fieldType: 'string',
    linkValue: undefined,
    timelineId,
  };
  const linkValue = getOr(null, 'originalValue.0', linkValueField);
  const category = item.category ?? '';
  const fieldName = item.field ?? '';

  const browserField = get([category, 'fields', fieldName], browserFields);
  const overrideField = field?.overrideField;
  return {
    ...fieldInfo,
    data: {
      field: overrideField ?? fieldName,
      format: browserField?.format ?? '',
      type: browserField?.type ?? '',
      isObjectArray: item.isObjectArray,
    },
    values: item.values,
    linkValue: linkValue ?? undefined,
    fieldFromBrowserField: browserField,
  };
}
