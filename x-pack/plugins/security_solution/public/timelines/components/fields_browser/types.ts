/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColumnHeaderOptions } from '../../../../common';
import { BrowserFields } from '../../../common/containers/source';

export type OnFieldSelected = (fieldId: string) => void;
export type OnHideFieldBrowser = () => void;

export interface FieldBrowserProps {
  /** The timeline's current column headers */
  columnHeaders: ColumnHeaderOptions[];
  /** A map of categoryId -> metadata about the fields in that category */
  browserFields: BrowserFields;
  /** The height of the field browser */
  height: number;
  /** When true, this Fields Browser is being used as an "events viewer" */
  isEventViewer?: boolean;
  /**
   * Overrides the default behavior of the `FieldBrowser` to enable
   * "selection" mode, where a field is selected by clicking a button
   * instead of dragging it to the timeline
   */
  onFieldSelected?: OnFieldSelected;
  /** The timeline associated with this field browser */
  timelineId: string;
  /** The width of the field browser */
  width: number;
}
