/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBasicTable } from '@elastic/eui';
import { Case } from '../../containers/types';
import { CasesColumns } from './columns';
import { basicCase, cases } from '../../containers/mock';

type ExpandedRowMap = Record<string, Element> | {};

export const getExpandedRowMap = ({
  data = cases, // mock
  columns,
  isModal = false,
  userCanCrud,
}: {
  data: Case[] | null;
  columns: CasesColumns[];
  isModal: boolean;
  userCanCrud: boolean;
}): ExpandedRowMap => {
  if (data == null) {
    return {};
  }

  return [...data].reduce((acc, curr) => {
    curr.subCases = [basicCase]; // mock data
    if (curr.subCases != null) {
      return {
        ...acc,
        [curr.id]: (
          <EuiBasicTable
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
