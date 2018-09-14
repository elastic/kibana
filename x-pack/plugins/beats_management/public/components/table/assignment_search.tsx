/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore EuiSearchBar has no type definitions yet
import { EuiInMemoryTable } from '@elastic/eui';
import React from 'react';
import { AssignmentOptionSearch } from './assignment_option_types';

interface AssignmentSearchProps {
  options: AssignmentOptionSearch;
}

export const AssignmentSearch = ({
  options: { actionHandler, columnDefinitions, searchFailureMessage, searchBox, searchResults },
}: AssignmentSearchProps) => (
  <EuiInMemoryTable
    columns={columnDefinitions}
    items={searchResults}
    message={searchFailureMessage}
    search={{
      searchBox,
      onChange: (query: any, queryString: string, error: any) =>
        actionHandler('assignmentSearch', { query, queryString, error }),
    }}
    style={{ maxWidth: '500px' }}
  />
);
