/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { EuiFocusTrap, EuiOutsideClickDetector, EuiScreenReaderOnly } from '@elastic/eui';
import React from 'react';

import { BrowserFields } from '../../../../../../common/containers/source';
import {
  ARIA_COLINDEX_ATTRIBUTE,
  ARIA_ROWINDEX_ATTRIBUTE,
} from '../../../../../../common/components/accessibility/helpers';
import { TimelineItem } from '../../../../../../../common/search_strategy/timeline';
import { getRowRenderer } from '../../renderers/get_row_renderer';
import { RowRenderer } from '../../renderers/row_renderer';
import { useStatefulEventFocus } from '../use_stateful_event_focus';

import * as i18n from '../translations';

/**
 * This component addresses the accessibility of row renderers.
 *
 * accessibility details:
 * - This component has a 'dialog' `role` because it's rendered as a dialog
 *   "outside" the current row for screen readers, similar to a popover
 * - It has tabIndex="0" to allow for keyboard focus
 * - It traps keyboard focus when a user clicks inside a row renderer, to
 *   allow for tabbing through the contents of row renderers
 * - The "dialog" can be dismissed via the up arrow key, down arrow key,
 *   which focuses the current or next row, respectively.
 * - A screen-reader-only message provides additional context and instruction
 */
export const StatefulRowRenderer = ({
  ariaRowindex,
  browserFields,
  containerRef,
  event,
  lastFocusedAriaColindex,
  rowRenderers,
  timelineId,
}: {
  ariaRowindex: number;
  browserFields: BrowserFields;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  event: TimelineItem;
  lastFocusedAriaColindex: number;
  rowRenderers: RowRenderer[];
  timelineId: string;
}) => {
  const { focusOwnership, onFocus, onKeyDown, onOutsideClick } = useStatefulEventFocus({
    ariaRowindex,
    colindexAttribute: ARIA_COLINDEX_ATTRIBUTE,
    containerRef,
    lastFocusedAriaColindex,
    onColumnFocused: noop,
    rowindexAttribute: ARIA_ROWINDEX_ATTRIBUTE,
  });

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div role="dialog" onFocus={onFocus}>
      <EuiScreenReaderOnly data-test-subj="eventRendererScreenReaderOnly">
        <p>{i18n.YOU_ARE_IN_AN_EVENT_RENDERER(ariaRowindex)}</p>
      </EuiScreenReaderOnly>

      {focusOwnership !== 'owned' ? (
        getRowRenderer(event.ecs, rowRenderers).renderRow({
          browserFields,
          data: event.ecs,
          timelineId,
        })
      ) : (
        <EuiOutsideClickDetector onOutsideClick={onOutsideClick}>
          <div>
            <EuiFocusTrap>
              <div onKeyDown={onKeyDown}>
                {getRowRenderer(event.ecs, rowRenderers).renderRow({
                  browserFields,
                  data: event.ecs,
                  timelineId,
                })}
              </div>
            </EuiFocusTrap>
          </div>
        </EuiOutsideClickDetector>
      )}
    </div>
  );
};
