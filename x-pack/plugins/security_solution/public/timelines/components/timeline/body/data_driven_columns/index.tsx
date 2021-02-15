/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import React from 'react';
import { getOr } from 'lodash/fp';

import { DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME } from '../../../../../common/components/drag_and_drop/helpers';
import { Ecs } from '../../../../../../common/ecs';
import { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { TimelineTabs } from '../../../../../../common/types/timeline';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { ARIA_COLUMN_INDEX_OFFSET } from '../../helpers';
import { EventsTd, EVENTS_TD_CLASS_NAME, EventsTdContent, EventsTdGroupData } from '../../styles';
import { ColumnRenderer } from '../renderers/column_renderer';
import { getColumnRenderer } from '../renderers/get_column_renderer';

import * as i18n from './translations';

interface Props {
  _id: string;
  ariaRowindex: number;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  hasRowRenderers: boolean;
  notesCount: number;
  tabType?: TimelineTabs;
  timelineId: string;
}

const SPACE = ' ';

export const shouldForwardKeyDownEvent = (key: string): boolean => {
  switch (key) {
    case SPACE: // fall through
    case 'Enter':
      return true;
    default:
      return false;
  }
};

export const onKeyDown = (keyboardEvent: React.KeyboardEvent) => {
  const { altKey, ctrlKey, key, metaKey, shiftKey, target, type } = keyboardEvent;

  const targetElement = target as Element;

  // we *only* forward the event to the (child) draggable keyboard wrapper
  // if the keyboard event originated from the container (TD) element
  if (shouldForwardKeyDownEvent(key) && targetElement.className?.includes(EVENTS_TD_CLASS_NAME)) {
    const draggableKeyboardWrapper = targetElement.querySelector<HTMLDivElement>(
      `.${DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME}`
    );

    const newEvent = new KeyboardEvent(type, {
      altKey,
      bubbles: true,
      cancelable: true,
      ctrlKey,
      key,
      metaKey,
      shiftKey,
    });

    if (key === ' ') {
      // prevent the default behavior of scrolling the table when space is pressed
      keyboardEvent.preventDefault();
    }
    if (draggableKeyboardWrapper) {
      draggableKeyboardWrapper.dispatchEvent(newEvent);
    }
  }
};

export const DataDrivenColumns = React.memo<Props>(
  ({
    _id,
    ariaRowindex,
    columnHeaders,
    columnRenderers,
    data,
    ecsData,
    hasRowRenderers,
    notesCount,
    tabType,
    timelineId,
  }) => (
    <EventsTdGroupData data-test-subj="data-driven-columns">
      {columnHeaders.map((header, i) => (
        <EventsTd
          $ariaColumnIndex={i + ARIA_COLUMN_INDEX_OFFSET}
          key={tabType != null ? `${header.id}_${tabType}` : `${header.id}`}
          onKeyDown={onKeyDown}
          role="button"
          tabIndex={0}
          width={header.width}
        >
          <EventsTdContent data-test-subj="cell-container">
            <>
              <EuiScreenReaderOnly data-test-subj="screenReaderOnly">
                <p>{i18n.YOU_ARE_IN_A_TABLE_CELL({ row: ariaRowindex, column: i + 2 })}</p>
              </EuiScreenReaderOnly>
              {getColumnRenderer(header.id, columnRenderers, data).renderColumn({
                columnName: header.id,
                eventId: _id,
                field: header,
                linkValues: getOr([], header.linkField ?? '', ecsData),
                timelineId: tabType != null ? `${timelineId}-${tabType}` : timelineId,
                truncate: true,
                values: getMappedNonEcsValue({
                  data,
                  fieldName: header.id,
                }),
              })}
            </>
          </EventsTdContent>
          {hasRowRenderers ? (
            <EuiScreenReaderOnly data-test-subj="hasRowRendererScreenReaderOnly">
              <p>{i18n.EVENT_HAS_AN_EVENT_RENDERER(ariaRowindex)}</p>
            </EuiScreenReaderOnly>
          ) : null}

          {notesCount ? (
            <EuiScreenReaderOnly data-test-subj="hasNotesScreenReaderOnly">
              <p>{i18n.EVENT_HAS_NOTES({ row: ariaRowindex, notesCount })}</p>
            </EuiScreenReaderOnly>
          ) : null}
        </EventsTd>
      ))}
    </EventsTdGroupData>
  )
);

DataDrivenColumns.displayName = 'DataDrivenColumns';

export const getMappedNonEcsValue = ({
  data,
  fieldName,
}: {
  data: TimelineNonEcsData[];
  fieldName: string;
}): string[] | undefined => {
  const item = data.find((d) => d.field === fieldName);
  if (item != null && item.value != null) {
    return item.value;
  }
  return undefined;
};
