/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestUtils } from '../../../../../../src/plugins/es_ui_shared/public';

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { RemoteClusterEdit } from '../../../public/application/sections/remote_cluster_edit';
import { createRemoteClustersStore } from '../../../public/application/store';
import { registerRouter } from '../../../public/application/services/routing';

import { REMOTE_CLUSTER_EDIT_NAME } from './constants';

const { registerTestBed } = TestUtils;

const testBedConfig = {
  store: createRemoteClustersStore,
  memoryRouter: {
    onRouter: router => registerRouter(router),
    // The remote cluster name to edit is read from the router ":id" param
    // so we first set it in our initial entries
    initialEntries: [`/${REMOTE_CLUSTER_EDIT_NAME}`],
    // and then we declarae the :id param on the component route path
    componentRoutePath: '/:name',
  },
};

export const setup = registerTestBed(RemoteClusterEdit, testBedConfig);
