/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import type { SavedObject, SavedObjectsType } from '@kbn/core/server';
import { metricsExplorerViewSavedObjectRT } from './types';

export const metricsExplorerViewSavedObjectName = 'metrics-explorer-view';

const getMetricsExplorerViewTitle = (savedObject: SavedObject<unknown>) =>
  pipe(
    metricsExplorerViewSavedObjectRT.decode(savedObject),
    fold(
      () => `Metrics explorer view [id=${savedObject.id}]`,
      ({ attributes: { name } }) => name
    )
  );

export const metricsExplorerViewSavedObjectType: SavedObjectsType = {
  name: metricsExplorerViewSavedObjectName,
  hidden: false,
  namespaceType: 'single',
  management: {
    defaultSearchField: 'name',
    displayName: 'metrics explorer view',
    getTitle: getMetricsExplorerViewTitle,
    icon: 'metricsApp',
    importableAndExportable: true,
  },
  mappings: {
    dynamic: false,
    properties: {},
  },
};
