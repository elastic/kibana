/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiInMemoryTable } from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import { xor, xorBy } from 'lodash/fp';
import styled from 'styled-components';

import { RowRendererId } from '../../../../common/types/timeline';
import { renderers, RowRendererOption } from './catalog';

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

const RowRenderersBrowserComponent = React.forwardRef(
  ({ excludedRowRendererIds = [], setExcludedRowRendererIds }: RowRenderersBrowserProps, ref) => {
    const notExcludedRowRenderers = useMemo(() => {
      if (excludedRowRendererIds.length === Object.keys(RowRendererId).length) return [];

      return renderers.filter((renderer) => !excludedRowRendererIds.includes(renderer.id));
    }, [excludedRowRendererIds]);

    const handleNameClick = useCallback(
      (item: RowRendererOption) => () => {
        const newSelection = xor([item], notExcludedRowRenderers);
        // @ts-ignore
        ref?.current?.setSelection(newSelection); // eslint-disable-line no-unused-expressions
      },
      [notExcludedRowRenderers, ref]
    );

    const nameColumnRenderCallback = useCallback(
      (value, item) => (
        <StyledNameButton className="kbn-resetFocusState" onClick={handleNameClick(item)}>
          {value}
        </StyledNameButton>
      ),
      [handleNameClick]
    );

    const columns = useMemo(
      () => [
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
      [nameColumnRenderCallback]
    );

    const handleSelectable = useCallback(() => true, []);

    const handleSelectionChange = useCallback(
      (selection: RowRendererOption[]) => {
        if (!selection || !selection.length)
          return setExcludedRowRendererIds(Object.values(RowRendererId));

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
        sorting={initialSorting}
        isSelectable={true}
        selection={selectionValue}
      />
    );
  }
);

RowRenderersBrowserComponent.displayName = 'RowRenderersBrowserComponent';

export const RowRenderersBrowser = React.memo(RowRenderersBrowserComponent);

RowRenderersBrowser.displayName = 'RowRenderersBrowser';
