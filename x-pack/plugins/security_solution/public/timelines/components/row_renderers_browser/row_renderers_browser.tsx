/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiFlexItem, EuiInMemoryTable } from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import { xor } from 'lodash/fp';
import styled from 'styled-components';

import type { RowRendererId } from '../../../../common/types/timeline';
import type { RowRendererOption } from './catalog';
import { renderers } from './catalog';

interface RowRenderersBrowserProps {
  excludedRowRendererIds: RowRendererId[];
  setExcludedRowRendererIds: (excludedRowRendererIds: RowRendererId[]) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StyledEuiInMemoryTable = styled(EuiInMemoryTable as any)`
  .euiTable {
    tr > *:last-child {
      display: none;
    }

    .euiTableHeaderCellCheckbox > .euiTableCellContent {
      display: none; // we don't want to display checkbox in the table
    }
  }
`;

const StyledEuiFlexItem = styled(EuiFlexItem)`
  overflow: auto;

  > div {
    padding: 0;

    > div {
      margin: 0;
    }
  }
`;

const ExampleWrapperComponent = (Example?: React.ElementType) => {
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
const renderSearchableDescriptionNoop = () => <></>;

const initialSorting = {
  sort: {
    field: 'name',
    direction: 'asc',
  },
};

const StyledNameButton = styled.button`
  text-align: left;
`;

const RowRenderersBrowserComponent = ({
  excludedRowRendererIds = [],
  setExcludedRowRendererIds,
}: RowRenderersBrowserProps) => {
  const handleNameClick = useCallback(
    (item: RowRendererOption) => () => {
      const newSelection = xor([item.id], excludedRowRendererIds);

      setExcludedRowRendererIds(newSelection);
    },
    [excludedRowRendererIds, setExcludedRowRendererIds]
  );

  const nameColumnRenderCallback = useCallback(
    (value, item) => (
      <StyledNameButton className="kbn-resetFocusState" onClick={handleNameClick(item)}>
        {value}
      </StyledNameButton>
    ),
    [handleNameClick]
  );

  const idColumnRenderCallback = useCallback(
    (_, item) => (
      <EuiCheckbox
        id={item.id}
        onChange={handleNameClick(item)}
        checked={!excludedRowRendererIds.includes(item.id)}
      />
    ),
    [excludedRowRendererIds, handleNameClick]
  );

  const columns = useMemo(
    () => [
      {
        field: 'id',
        name: '',
        sortable: false,
        width: '32px',
        render: idColumnRenderCallback,
      },
      {
        field: 'name',
        name: 'Name',
        sortable: true,
        width: '10%',
        render: nameColumnRenderCallback,
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
        name: 'Searchable Description',
        sortable: false,
        width: '0px',
        render: renderSearchableDescriptionNoop,
      },
    ],
    [idColumnRenderCallback, nameColumnRenderCallback]
  );

  return (
    <StyledEuiInMemoryTable
      items={renderers}
      itemId="id"
      columns={columns}
      search={search}
      sorting={initialSorting}
      isSelectable={true}
    />
  );
};

RowRenderersBrowserComponent.displayName = 'RowRenderersBrowserComponent';

export const RowRenderersBrowser = React.memo(RowRenderersBrowserComponent);

RowRenderersBrowser.displayName = 'RowRenderersBrowser';
