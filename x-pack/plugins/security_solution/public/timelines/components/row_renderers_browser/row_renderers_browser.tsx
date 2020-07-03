/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiFlexItem, EuiInMemoryTable } from '@elastic/eui';
import React, { useMemo, useCallback, useState } from 'react';
import { xorBy } from 'lodash/fp';
import styled from 'styled-components';

import { RowRendererId } from '../../../../common/types/timeline';
import { renderers, RowRendererOption } from './catalog';
import { FieldBrowserProps } from './types';
import { OnTableChangeParams } from '../open_timeline/types';

type Props = Pick<FieldBrowserProps, 'height' | 'timelineId'> & {
  excludedRowRendererIds: RowRendererId[];
  setExcludedRowRendererIds: (excludedRowRendererIds: RowRendererId[]) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StyledEuiInMemoryTable = styled(EuiInMemoryTable as any)`
  .euiTable {
    width: auto;

    .euiTableHeaderCellCheckbox > .euiTableCellContent {
      display: none; // we don't want to display checkbox in the table
    }
  }
`;

const StyledEuiFlexItem = styled(EuiFlexItem)`
  > div {
    padding: 0;

    > div {
      margin: 0;
    }
  }
`;

const ExampleWrapperComponent = (Example?: React.ReactElement) => {
  if (!Example) return;

  return (
    <StyledEuiFlexItem grow={1}>
      <Example />
    </StyledEuiFlexItem>
  );
};

const search = {
  box: {
    incremental: true,
    schema: true,
  },
};

/**
 * Since `searchableDescription` contains raw text to power the Search bar,
 * this "noop" function ensures it's not actually rendered
 */
const renderSearchableDescriptionNoop = () => null;

const FieldsBrowserComponent: React.FC<Props> = React.forwardRef(
  ({ excludedRowRendererIds = [], setExcludedRowRendererIds }, ref) => {
    const [sortField, setSortField] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');

    const onTableChange = useCallback(
      ({ page, sort }: OnTableChangeParams) => {
        const { field, direction } = sort;
        setSortDirection(direction);
        setSortField(field);
      },
      [setSortField, setSortDirection]
    );

    const sort = useMemo(
      () => ({
        sortField,
        sortDirection,
      }),
      [sortField, sortDirection]
    );

    const columns = useMemo(
      () => [
        {
          field: 'name',
          name: 'Name',
          sortable: true,
          truncateText: true,
          width: '10%',
        },
        {
          field: 'description',
          name: 'Description',
          width: '25%',
          render: (description: React.ReactNode) => description,
        },
        {
          field: 'example',
          name: 'Example',
          width: '65%',
          render: ExampleWrapperComponent,
        },
        {
          field: 'searchableDescription',
          sortable: false,
          width: '0px',
          render: renderSearchableDescriptionNoop,
        },
      ],
      []
    );

    const notExcludedRowRenderers = useMemo(() => {
      if (excludedRowRendererIds.includes(RowRendererId.all)) return [];

      return renderers.filter((renderer) => !excludedRowRendererIds.includes(renderer.id));
    }, [excludedRowRendererIds]);

    const handleSelectable = useCallback(() => true, []);

    const handleSelectionChange = useCallback(
      (selection: RowRendererOption[]) => {
        if (!selection || !selection.length) return setExcludedRowRendererIds([RowRendererId.all]);

        const excludedRowRenderers = xorBy('id', renderers, selection);

        setExcludedRowRendererIds(excludedRowRenderers.map((rowRenderer) => rowRenderer.id));
      },
      [setExcludedRowRendererIds]
    );

    const selectionValue = useMemo(
      () => ({
        selectable: handleSelectable,
        onSelectionChange: handleSelectionChange,
        initialSelected: notExcludedRowRenderers,
      }),
      [handleSelectable, handleSelectionChange, notExcludedRowRenderers]
    );

    return (
      <StyledEuiInMemoryTable
        ref={ref}
        items={renderers}
        itemId="id"
        columns={columns}
        search={search}
        sorting={sort}
        isSelectable={true}
        selection={selectionValue}
        onTableChange={onTableChange}
      />
    );
  }
);

export const RowRenderersBrowser = React.memo(FieldsBrowserComponent);
