/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Actions } from '../../../../server/authorization';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { privilegesFactory } from '../../../../server/authorization/privileges';
import { Feature } from '../../../../../features/public';
import { KibanaPrivileges } from '../model';

export const createRawKibanaPrivileges = (features: Feature[]) => {
  return privilegesFactory(new Actions('unit_test_version'), {
    getFeatures: () => features,
  }).get();
};

export const createKibanaPrivileges = (features: Feature[]) => {
  return new KibanaPrivileges(createRawKibanaPrivileges(features), features);
};
