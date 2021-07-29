/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESCaseConnector } from '.';
import { CaseConnector, ConnectorTypes } from '../../common';

/**
 * This file contains utility functions to aid unit test development
 */

/**
 * Create an Elasticsearch jira connector.
 *
 * @param overrides fields used to override the default jira connector
 * @returns a jira Elasticsearch connector (it has key value pairs for the fields) by default
 */
export const createESConnector = (overrides?: Partial<ESCaseConnector>): ESCaseConnector => {
  return {
    id: '1',
    name: ConnectorTypes.jira,
    fields: [
      { key: 'issueType', value: 'bug' },
      { key: 'priority', value: 'high' },
      { key: 'parent', value: '2' },
    ],
    type: ConnectorTypes.jira,
    ...(overrides && { ...overrides }),
  };
};

/**
 * Creates a jira CaseConnector (has the actual fields defined in the object instead of key value paris)
 * @param setFieldsToNull a flag that controls setting the fields property to null
 * @returns a jira connector
 */
export const createJiraConnector = (setFieldsToNull?: boolean): CaseConnector => {
  return {
    id: '1',
    name: ConnectorTypes.jira,
    type: ConnectorTypes.jira,
    fields: setFieldsToNull
      ? null
      : {
          issueType: 'bug',
          priority: 'high',
          parent: '2',
        },
  };
};
