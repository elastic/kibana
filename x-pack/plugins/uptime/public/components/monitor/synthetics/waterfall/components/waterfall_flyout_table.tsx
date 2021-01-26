/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';

import { EuiText, EuiBasicTable, EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';

interface Row {
  name: string;
  value?: string;
}

interface Props {
  rows: Row[];
  title: string;
}

class TableWithoutHeader extends EuiBasicTable {
  renderTableHead() {
    return <></>;
  }
}

export const Table = (props: Props) => {
  const { rows, title } = props;
  const columns = useMemo(
    () => [
      {
        field: 'name',
        name: '',
        sortable: false,
        render: (name: string, item: Row) => (
          <EuiText size="xs">
            <strong>{item.name}</strong>
          </EuiText>
        ),
      },
      {
        field: 'value',
        name: '',
        sortable: false,
        render: (_name: string, item: Row) => {
          return (
            <span>
              <EuiFlexGroup gutterSize={'xs'} alignItems={'center'} responsive={false}>
                <EuiFlexItem>{item.value ?? '--'}</EuiFlexItem>
              </EuiFlexGroup>
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <>
      <EuiText>
        <h4>{title}</h4>
        <EuiSpacer size="s" />
      </EuiText>
      <TableWithoutHeader
        tableLayout={'fixed'}
        compressed
        responsive={false}
        columns={columns}
        items={rows}
      />
    </>
  );
};
