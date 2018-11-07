/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OnColumnSorted, OnFilterChange } from '../../events';
import { Sort, SortDirection } from '../sort';
import { SortIndicator } from '../sort/sort_indicator';
import { ColumnHeader } from './column_header';
import { Filter } from './filter';

interface GetSortDirectionParams {
  header: ColumnHeader;
  sort: Sort;
}

/** Given a `header`, returns the `SortDirection` applicable to it */
export const getSortDirection = ({ header, sort }: GetSortDirectionParams): SortDirection =>
  header.id === sort.columnId ? sort.sortDirection : 'none';

const unhandledSortDirection = (x: never): never => {
  throw new Error('Unhandled sort direction');
};

/** Given a current sort direction, it returns the next sort direction */
export const getNextSortDirection = (currentSort: Sort): SortDirection => {
  switch (currentSort.sortDirection) {
    case 'descending':
      return 'ascending';
    case 'ascending':
      return 'descending';
    case 'none':
      return 'descending';
    default:
      return unhandledSortDirection(currentSort.sortDirection);
  }
};

interface GetNewSortDirectionOnClickParams {
  clickedHeader: ColumnHeader;
  currentSort: Sort;
}

/** Given a `header`, returns the `SortDirection` applicable to it */
export const getNewSortDirectionOnClick = ({
  clickedHeader,
  currentSort,
}: GetNewSortDirectionOnClickParams): SortDirection =>
  clickedHeader.id === currentSort.columnId ? getNextSortDirection(currentSort) : 'descending';

interface Props {
  header: ColumnHeader;
  onColumnSorted?: OnColumnSorted;
  onFilterChange?: OnFilterChange;
  sort: Sort;
}

const HeaderContainer = styled.div<{ minwidth: string }>`
  display: flex;
  flex-direction: column;
  margin-top: 8px;
  min-width: ${props => props.minwidth};
`;

const HeaderDiv = styled.div`
  cursor: pointer;
  display: flex;
  flex-direction: row;
`;

const Text = styled(EuiText)`
  display: inline;
`;

/** Renders a header */
export const Header = pure<Props>(
  ({ header, sort, onColumnSorted = noop, onFilterChange = noop }) => {
    const onClick = () => {
      onColumnSorted({
        columnId: header.id,
        sortDirection: getNewSortDirectionOnClick({
          clickedHeader: header,
          currentSort: sort,
        }),
      });
    };

    return (
      <HeaderContainer
        data-test-subj="headerContainer"
        key={header.id}
        minwidth={`${header.minWidth}px`}
      >
        <HeaderDiv data-test-subj="header" onClick={onClick}>
          <Text data-test-subj="headerText">{header.text}</Text>
          <SortIndicator sortDirection={getSortDirection({ header, sort })} />
        </HeaderDiv>
        <Filter header={header} onFilterChange={onFilterChange} />
      </HeaderContainer>
    );
  }
);
