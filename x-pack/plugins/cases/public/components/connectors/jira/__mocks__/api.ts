/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetIssueTypesProps, GetFieldsByIssueTypeProps, GetIssueTypeProps } from '../api';
import type { IssueTypes, Fields, Issues, Issue } from '../types';
import { issues } from '../../mock';

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

export const getIssue = async (props: GetIssueTypeProps): Promise<{ data: Issue }> =>
  Promise.resolve({ data: issues[0] });
export const getIssues = async (props: GetIssueTypesProps): Promise<{ data: Issues }> =>
  Promise.resolve({ data: issues });
export const getIssueTypes = async (props: GetIssueTypesProps): Promise<{ data: IssueTypes }> =>
  Promise.resolve({ data: issueTypes });

export const getFieldsByIssueType = async (
  props: GetFieldsByIssueTypeProps
): Promise<{ data: Fields }> => Promise.resolve({ data: fieldsByIssueType });
