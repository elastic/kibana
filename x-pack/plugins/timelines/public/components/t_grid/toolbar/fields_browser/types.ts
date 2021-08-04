/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields } from '../../../../../common/search_strategy/index_fields';
import type { ColumnHeaderOptions } from '../../../../../common/types/timeline/columns';

export type OnFieldSelected = (fieldId: string) => void;

export interface FieldBrowserProps {
  /** The timeline associated with this field browser */
  timelineId: string;
  /** The timeline's current column headers */
  columnHeaders: ColumnHeaderOptions[];
  /** A map of categoryId -> metadata about the fields in that category */
  browserFields: BrowserFields;
  /** When true, this Fields Browser is being used as an "events viewer" */
  isEventViewer?: boolean;
  /** The width of the field browser */
  width?: number;
}
