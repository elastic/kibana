/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectReference, SavedObjectsFindResult } from '@kbn/core/server';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import { ESConnectorFields } from '.';
import { CONNECTOR_ID_REFERENCE_NAME, PUSH_CONNECTOR_ID_REFERENCE_NAME } from '../common/constants';
import {
  CaseConnector,
  CaseExternalServiceBasic,
  CaseFullExternalService,
  CaseStatuses,
  ConnectorTypes,
  NONE_CONNECTOR_ID,
} from '../../common/api';
import { CASE_SAVED_OBJECT, SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { ESCaseAttributes, ExternalServicesWithoutConnectorId } from './cases/types';

/**
 * This is only a utility interface to help with constructing test cases. After the migration, the ES format will no longer
 * have the id field. Instead it will be moved to the references array.
 */
export interface ESCaseConnectorWithId {
  id: string;
  name: string;
  type: ConnectorTypes;
  fields: ESConnectorFields | null;
}

/**
 * This file contains utility functions to aid unit test development
 */

/**
 * Create an Elasticsearch jira connector.
 *
 * @param overrides fields used to override the default jira connector
 * @returns a jira Elasticsearch connector (it has key value pairs for the fields) by default
 */
export const createESJiraConnector = (
  overrides?: Partial<ESCaseConnectorWithId>
): ESCaseConnectorWithId => {
  return {
    id: '1',
    name: ConnectorTypes.jira,
    fields: [
      { key: 'issueType', value: 'bug' },
      { key: 'priority', value: 'high' },
      { key: 'parent', value: '2' },
    ],
    type: ConnectorTypes.jira,
    ...overrides,
  };
};

/**
 * Creates a jira CaseConnector (has the actual fields defined in the object instead of key value paris)
 * @param setFieldsToNull a flag that controls setting the fields property to null
 * @returns a jira connector
 */
export const createJiraConnector = ({
  setFieldsToNull,
}: { setFieldsToNull?: boolean } = {}): CaseConnector => {
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

export const createExternalService = (
  overrides?: Partial<CaseExternalServiceBasic>
): CaseExternalServiceBasic => ({
  connector_id: '100',
  connector_name: '.jira',
  external_id: '100',
  external_title: 'awesome',
  external_url: 'http://www.google.com',
  pushed_at: '2019-11-25T21:54:48.952Z',
  pushed_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  ...overrides,
});

export const basicCaseFields = {
  closed_at: null,
  closed_by: null,
  created_at: '2019-11-25T21:54:48.952Z',
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  duration: null,
  description: 'This is a brand new case of a bad meanie defacing data',
  title: 'Super Bad Security Issue',
  status: CaseStatuses.open,
  tags: ['defacement'],
  updated_at: '2019-11-25T21:54:48.952Z',
  updated_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  settings: {
    syncAlerts: true,
  },
  owner: SECURITY_SOLUTION_OWNER,
};

export const createCaseSavedObjectResponse = ({
  connector,
  externalService,
}: {
  connector?: ESCaseConnectorWithId;
  externalService?: CaseFullExternalService;
} = {}): SavedObject<ESCaseAttributes> => {
  const references: SavedObjectReference[] = createSavedObjectReferences({
    connector,
    externalService,
  });

  const formattedConnector = {
    type: connector?.type ?? ConnectorTypes.jira,
    name: connector?.name ?? ConnectorTypes.jira,
    fields: connector?.fields ?? null,
  };

  let restExternalService: ExternalServicesWithoutConnectorId | null = null;
  if (externalService !== null) {
    const { connector_id: ignored, ...rest } = externalService ?? {
      connector_name: '.jira',
      external_id: '100',
      external_title: 'awesome',
      external_url: 'http://www.google.com',
      pushed_at: '2019-11-25T21:54:48.952Z',
      pushed_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
    };
    restExternalService = rest;
  }

  return {
    type: CASE_SAVED_OBJECT,
    id: '1',
    attributes: {
      ...basicCaseFields,
      // if connector is null we'll default this to an incomplete jira value because the service
      // should switch it to a none connector when the id can't be found in the references array
      connector: formattedConnector,
      external_service: restExternalService,
    },
    references,
  };
};

export const createSavedObjectReferences = ({
  connector,
  externalService,
}: {
  connector?: ESCaseConnectorWithId;
  externalService?: CaseFullExternalService;
} = {}): SavedObjectReference[] => [
  ...(connector && connector.id !== NONE_CONNECTOR_ID
    ? [
        {
          id: connector.id,
          name: CONNECTOR_ID_REFERENCE_NAME,
          type: ACTION_SAVED_OBJECT_TYPE,
        },
      ]
    : []),
  ...(externalService && externalService.connector_id
    ? [
        {
          id: externalService.connector_id,
          name: PUSH_CONNECTOR_ID_REFERENCE_NAME,
          type: ACTION_SAVED_OBJECT_TYPE,
        },
      ]
    : []),
];

export const createConnectorObject = (overrides?: Partial<CaseConnector>) => ({
  connector: { ...createJiraConnector(), ...overrides },
});

export const createSOFindResponse = <T>(savedObjects: Array<SavedObjectsFindResult<T>>) => ({
  saved_objects: savedObjects,
  total: savedObjects.length,
  per_page: savedObjects.length,
  page: 1,
});
