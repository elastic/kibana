/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { head } from 'lodash/fp';
import React, { useMemo } from 'react';
import { Filter } from '../../../../../../../../../src/plugins/data/public';
import { BrowserField } from '../../../../../../../timelines/common/search_strategy/index_fields';

import { ColumnHeaderOptions } from '../../../../../../common';
import { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { allowTopN } from '../../../../../common/components/drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { ShowTopNButton } from '../../../../../common/components/hover_actions/actions/show_top_n';
import { getAllFieldsByName } from '../../../../../common/containers/source';
import { ExpandTopValue } from '../../../../../common/lib/cell_actions/expand_top_value';
import { ColumnRenderer } from './column_renderer';
import { FormattedFieldValue } from './formatted_field';
import { parseValue } from './parse_value';

export const dataExistsAtColumn = (columnName: string, data: TimelineNonEcsData[]): boolean =>
  data.findIndex((item) => item.field === columnName) !== -1;

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) =>
    dataExistsAtColumn(columnName, data),

  // eslint-disable-next-line react/display-name
  renderColumn: ({
    asPlainText,
    browserFields,
    className,
    columnName,
    eventId,
    field,
    globalFilters,
    isDetails,
    isDraggable = true,
    timelineId,
    truncate,
    values,
    linkValues,
  }: {
    asPlainText?: boolean;
    browserFields: BrowserField;
    className?: string;
    columnName: string;
    eventId: string;
    field: ColumnHeaderOptions;
    globalFilters?: Filter[];
    isDetails: boolean;
    isDraggable?: boolean;
    timelineId: string;
    truncate?: boolean;
    values: string[] | undefined | null;
    linkValues?: string[] | null | undefined;
  }) => {
    return values != null ? (
      <>
        {values.map((value, i) => (
          <FormattedFieldValue
            asPlainText={asPlainText}
            className={className}
            contextId={`plain-column-renderer-formatted-field-value-${timelineId}`}
            eventId={eventId}
            fieldFormat={field.format || ''}
            fieldName={columnName}
            fieldType={field.type || ''}
            isDraggable={isDraggable}
            key={`plain-column-renderer-formatted-field-value-${timelineId}-${columnName}-${eventId}-${field.id}-${value}-${i}`}
            linkValue={head(linkValues)}
            truncate={truncate}
            value={parseValue(value)}
          />
        ))}
        {isDetails && (
          <ExpandTopValue
            browserFields={browserFields}
            field={columnName}
            globalFilters={globalFilters}
            timelineId={timelineId}
            value={values}
          />
        )}
      </>
    ) : (
      getEmptyTagValue()
    );
  },
};
