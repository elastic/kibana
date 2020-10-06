/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetIssueTypesProps, GetFieldsByIssueTypeProps } from '../api';
import { IssueTypes, Fields } from '../types';

const issueTypes = [
  {
    id: '10006',
    name: 'Task',
  },
  {
    id: '10007',
    name: 'Bug',
  },
];

const fieldsByIssueType = {
  summary: { allowedValues: [], defaultValue: {} },
  priority: {
    allowedValues: [
      {
        name: 'Medium',
        id: '3',
      },
    ],
    defaultValue: { name: 'Medium', id: '3' },
  },
};

export const getIssueTypes = async (props: GetIssueTypesProps): Promise<{ data: IssueTypes }> =>
  Promise.resolve({ data: issueTypes });

export const getFieldsByIssueType = async (
  props: GetFieldsByIssueTypeProps
): Promise<{ data: Fields }> => Promise.resolve({ data: fieldsByIssueType });
