/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestUtils } from '../../../../../../src/plugins/es_ui_shared/public';
import { setup as remoteClustersAddSetup } from './remote_clusters_add.helpers';
import { setup as remoteClustersEditSetup } from './remote_clusters_edit.helpers';
import { setup as remoteClustersListSetup } from './remote_clusters_list.helpers';

const { nextTick, getRandomString, findTestSubject } = TestUtils;

export { nextTick, getRandomString, findTestSubject };

export { setupEnvironment } from './setup_environment';

export const pageHelpers = {
  remoteClustersAdd: { setup: remoteClustersAddSetup },
  remoteClustersEdit: { setup: remoteClustersEditSetup },
  remoteClustersList: { setup: remoteClustersListSetup },
};
