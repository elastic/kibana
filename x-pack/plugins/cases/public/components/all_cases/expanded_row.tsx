/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable as _EuiBasicTable } from '@elastic/eui';
import styled from 'styled-components';
import { Case, SubCase } from '../../containers/types';
import { CasesColumns } from './columns';
import { AssociationType } from '../../../common';

type ExpandedRowMap = Record<string, Element> | {};

const EuiBasicTable: any = _EuiBasicTable;
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
  data,
  columns,
  onSubCaseClick,
}: {
  data: Case[] | null;
  columns: CasesColumns[];
  onSubCaseClick?: (theSubCase: SubCase) => void;
}): ExpandedRowMap => {
  if (data == null) {
    return {};
  }

  const rowProps = (theSubCase: SubCase) => {
    return {
      ...(onSubCaseClick ? { onClick: () => onSubCaseClick(theSubCase) } : {}),
      className: 'subCase',
    };
  };

  return data.reduce((acc, curr) => {
    if (curr.subCases != null) {
      const subCases = curr.subCases.map((subCase, index) => ({
        ...subCase,
        caseParentId: curr.id,
        title: `${curr.title} ${index + 1}`,
        associationType: AssociationType.subCase,
      }));
      return {
        ...acc,
        [curr.id]: (
          <BasicTable
            columns={columns}
            data-test-subj={`sub-cases-table-${curr.id}`}
            itemId="id"
            items={subCases}
            rowProps={rowProps}
          />
        ),
      };
    } else {
      return acc;
    }
  }, {});
};
