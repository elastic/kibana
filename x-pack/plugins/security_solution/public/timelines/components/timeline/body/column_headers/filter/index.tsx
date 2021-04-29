/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import React from 'react';

import { DEFAULT_COLUMN_MIN_WIDTH } from '../../constants';
import { OnFilterChange } from '../../../events';
import { ColumnHeaderOptions } from '../../../../../../timelines/store/timeline/model';
import { TextFilter } from '../text_filter';

interface Props {
  header: ColumnHeaderOptions;
  onFilterChange?: OnFilterChange;
}

/** Renders a header's filter, based on the `columnHeaderType` */
export const Filter = React.memo<Props>(({ header, onFilterChange = noop }) => {
  switch (header.columnHeaderType) {
    case 'text-filter':
      return (
        <TextFilter
          columnId={header.id}
          minWidth={header.initialWidth ?? DEFAULT_COLUMN_MIN_WIDTH}
          onFilterChange={onFilterChange}
          placeholder={header.placeholder}
        />
      );
    case 'not-filtered': // fall through
    default:
      return null;
  }
});

Filter.displayName = 'Filter';
