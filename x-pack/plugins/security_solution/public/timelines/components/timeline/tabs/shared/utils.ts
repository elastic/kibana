/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { BrowserFields, ColumnHeaderOptions } from '@kbn/timelines-plugin/common';
import memoizeOne from 'memoize-one';
import type { ControlColumnProps } from '../../../../../../common/types';
import type { SortColumnTimeline as Sort } from '../../../../../../common/types/timeline';
import type { TimelineItem } from '../../../../../../common/search_strategy';
import type { inputsModel } from '../../../../../common/store';
import { getColumnHeaders } from '../../body/column_headers/helpers';
interface TimerangeSimilarityProps {
  end: inputsModel.InputsRange['timerange']['to'];
  start: inputsModel.InputsRange['timerange']['from'];
  timerangeKind: inputsModel.InputsRange['timerange']['kind'];
}

export const isTimerangeSame = (
  prevProps: TimerangeSimilarityProps,
  nextProps: TimerangeSimilarityProps
) =>
  prevProps.end === nextProps.end &&
  prevProps.start === nextProps.start &&
  prevProps.timerangeKind === nextProps.timerangeKind;

export const TIMELINE_EMPTY_EVENTS: TimelineItem[] = [];

export const TIMELINE_NO_SORTING: Sort[] = [];

export const timelineEmptyTrailingControlColumns: ControlColumnProps[] = [];

export const memoizedGetTimelineColumnHeaders: (
  headers: ColumnHeaderOptions[],
  browserFields: BrowserFields,
  isEventRenderedView: boolean
) => ColumnHeaderOptions[] = memoizeOne(getColumnHeaders);
