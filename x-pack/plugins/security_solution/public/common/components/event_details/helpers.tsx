/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr, isEmpty } from 'lodash/fp';

import {
  elementOrChildrenHasFocus,
  getFocusedDataColindexCell,
  getTableSkipFocus,
  handleSkipFocus,
  stopPropagationAndPreventDefault,
} from '@kbn/timelines-plugin/public';
import type { BrowserFields } from '../../containers/source';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import type { EnrichedFieldInfo, EventSummaryField } from './types';

import * as i18n from './translations';
import {
  AGENT_STATUS_FIELD_NAME,
  QUARANTINED_PATH_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD } from '../../../../common/endpoint/service/response_actions/constants';

/**
 * Defines the behavior of the search input that appears above the table of data
 */
export const search = {
  box: {
    incremental: true,
    placeholder: i18n.PLACEHOLDER,
    schema: true,
    'data-test-subj': 'search-input',
  },
};

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
  scopeId,
}: {
  browserFields: BrowserFields;
  contextId: string;
  item: TimelineEventsDetailsItem;
  eventId: string;
  field?: EventSummaryField;
  scopeId: string;
  linkValueField?: TimelineEventsDetailsItem;
}): EnrichedFieldInfo {
  const fieldInfo = {
    contextId,
    eventId,
    fieldType: 'string',
    linkValue: undefined,
    scopeId,
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

/**
 * A lookup table for fields that should not have actions
 */
export const FIELDS_WITHOUT_ACTIONS: { [field: string]: boolean } = {
  [AGENT_STATUS_FIELD_NAME]: true,
  [QUARANTINED_PATH_FIELD_NAME]: true,
  [RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.sentinel_one]: true,
  [RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.crowdstrike]: true,
};

/**
 * Checks whether the given field should have hover or row actions.
 * The lookup is fast, so it is not necessary to memoize the result.
 */
export function hasHoverOrRowActions(field: string): boolean {
  return !FIELDS_WITHOUT_ACTIONS[field];
}
