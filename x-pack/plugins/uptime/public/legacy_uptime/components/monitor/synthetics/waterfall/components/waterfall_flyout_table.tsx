/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';

import { EuiText, EuiBasicTable, EuiSpacer } from '@elastic/eui';

interface Row {
  name: string;
  value?: string;
}

interface Props {
  rows: Row[];
  title: string;
}

const StyledText = styled(EuiText)`
  width: 100%;
`;

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
        render: (_name: string, item: Row) => (
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
            <StyledText size="xs" textAlign="right">
              {item.value ?? '--'}
            </StyledText>
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
      </EuiText>
      <EuiSpacer size="s" />
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
