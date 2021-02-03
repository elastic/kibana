/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBasicTable as _EuiBasicTable } from '@elastic/eui';
import styled from 'styled-components';
import { Case } from '../../containers/types';
import { CasesColumns } from './columns';
import { basicCase, cases } from '../../containers/mock';

type ExpandedRowMap = Record<string, Element> | {};

const EuiBasicTable: any = _EuiBasicTable; // eslint-disable-line @typescript-eslint/no-explicit-any
const BasicTable = styled(EuiBasicTable)`
  thead {
    display: none;
  }

  tbody {
    .euiTableCellContent {
      padding: 8px !important;
    }
    .euiTableRowCell {
      border: 0;
    }
  }
`;
BasicTable.displayName = 'BasicTable';

export const getExpandedRowMap = ({
  data = cases, // mock
  columns,
}: {
  data: Case[] | null;
  columns: CasesColumns[];
}): ExpandedRowMap => {
  if (data == null) {
    return {};
  }

  return data.reduce((acc, curr) => {
    curr.subCases = [basicCase, basicCase]; // MOCK data
    if (curr.subCases != null) {
      return {
        ...acc,
        [curr.id]: (
          <BasicTable
            columns={columns}
            data-test-subj={`sub-cases-table-${curr.id}`}
            itemId="id"
            items={curr.subCases}
          />
        ),
      };
    } else {
      return acc;
    }
  }, {});
};
