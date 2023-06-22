/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';
import type { TimelineEventsType } from '../../../../common/types';

/**
 * This is the effective width in pixels of an action button used with
 * `EuiDataGrid` `leadingControlColumns`. (See Notes below for details)
 *
 * Notes:
 * 1) This constant is necessary because `width` is a required property of
 *    the `EuiDataGridControlColumn` interface, so it must be calculated before
 *    content is rendered. (The width of a `EuiDataGridControlColumn` does not
 *    automatically size itself to fit all the content.)
 *
 * 2) This is the *effective* width, because at the time of this writing,
 *    `EuiButtonIcon` has a `margin-left: -4px`, which is subtracted from the
 *    `width`
 */
export const DEFAULT_ACTION_BUTTON_WIDTH =
  parseInt(euiThemeVars.euiSizeXL, 10) - parseInt(euiThemeVars.euiSizeXS, 10); // px

export const isAlert = (eventType: TimelineEventsType | Omit<TimelineEventsType, 'all'>): boolean =>
  eventType === 'signal';

/**
 * Returns the width of the Actions column based on the number of buttons being
 * displayed
 *
 * NOTE: This function is necessary because `width` is a required property of
 * the `EuiDataGridControlColumn` interface, so it must be calculated before
 * content is rendered. (The width of a `EuiDataGridControlColumn` does not
 * automatically size itself to fit all the content.)
 */
export const getActionsColumnWidth = (actionButtonCount: number): number => {
  const contentWidth =
    actionButtonCount > 0
      ? actionButtonCount * DEFAULT_ACTION_BUTTON_WIDTH
      : DEFAULT_ACTION_BUTTON_WIDTH;

  // `EuiDataGridRowCell` applies additional `padding-left` and
  // `padding-right`, which must be added to the content width to prevent the
  // content from being partially hidden due to the space occupied by padding:
  const leftRightCellPadding = parseInt(euiThemeVars.euiDataGridCellPaddingM, 10) * 2; // parseInt ignores the trailing `px`, e.g. `6px`

  return contentWidth + leftRightCellPadding;
};

// Currently both logs-endpoint.events.process* and logs-cloud_defend.process* are valid sources for session data.
// To avoid cross cluster searches, the original index of the event is used to infer the index to find data for the
// rest of the session.
export const getSessionViewProcessIndex = (eventIndex?: string | null) => {
  if (!eventIndex) {
    return;
  }

  const match = eventIndex.match(/([a-z0-9_-]+:)?\.ds-logs-(endpoint|cloud_defend)/i);
  const cluster = match?.[1];
  const clusterStr = cluster ? `${cluster}` : '';
  const service = match?.[2];

  if (service === 'endpoint') {
    return `${clusterStr}logs-endpoint.events.process*`;
  } else if (service === 'cloud_defend') {
    return `${clusterStr}logs-cloud_defend.process*`;
  }
};
