/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { SortDirection } from '.';

export type SortDirectionIndicator = undefined | 'sortUp' | 'sortDown';

const unhandledDirection = (x: never): never => {
  throw new Error('Unhandled sort direction');
};

/** Returns the symbol that corresponds to the specified `SortDirection` */
export const getDirection = (sortDirection: SortDirection): SortDirectionIndicator => {
  switch (sortDirection) {
    case 'ascending':
      return 'sortUp';
    case 'descending':
      return 'sortDown';
    case 'none':
      return undefined;
    default:
      return unhandledDirection(sortDirection);
  }
};

interface Props {
  sortDirection: SortDirection;
}

const Icon = styled(EuiIcon)`
  margin: 2px 5px 0 5px;
`;

/** Renders a sort indicator */
export const SortIndicator = pure<Props>(({ sortDirection }) => (
  <Icon data-test-subj="sortIndicator" type={getDirection(sortDirection)} />
));
