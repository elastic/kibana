/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
import { SortDirection } from '.';

export type SortDirectionIndicator = '' | '^' | 'v';

const unhandledDirection = (x: never): never => {
  throw new Error('Unhandled sort direction');
};

/** Returns the symbol that corresponds to the specified `SortDirection` */
export const getDirection = (sortDirection: SortDirection): SortDirectionIndicator => {
  switch (sortDirection) {
    case 'ascending':
      return '^';
    case 'descending':
      return 'v';
    case 'none':
      return '';
    default:
      return unhandledDirection(sortDirection);
  }
};

interface Props {
  sortDirection: SortDirection;
}

/** Renders a sort indicator */
export const SortIndicator = pure<Props>(({ sortDirection }) => (
  <span
    data-test-subj="sortIndicator"
    style={{
      color: '#D9D9D9',
      margin: '0 5px 0 5px',
    }}
  >
    {getDirection(sortDirection)}
  </span>
));
