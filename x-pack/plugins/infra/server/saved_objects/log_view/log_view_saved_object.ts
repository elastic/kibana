/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { SavedObject, SavedObjectsType } from '@kbn/core/server';
import { logViewSavedObjectRT } from './types';

export const logViewSavedObjectName = 'infrastructure-monitoring-log-view';

const getLogViewTitle = (savedObject: SavedObject<unknown>) =>
  pipe(
    logViewSavedObjectRT.decode(savedObject),
    fold(
      () => `Log view [id=${savedObject.id}]`,
      ({ attributes: { name } }) => name
    )
  );

export const logViewSavedObjectType: SavedObjectsType = {
  name: logViewSavedObjectName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  management: {
    defaultSearchField: 'name',
    displayName: 'log view',
    getTitle: getLogViewTitle,
    icon: 'logsApp',
    importableAndExportable: true,
  },
  mappings: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
      },
    },
  },
  migrations: {},
};
