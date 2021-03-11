/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../common/lib/kibana';
import { MANAGEMENT_APP_ID } from '../../common/constants';

/**
 * Returns a full URL to the provided Management page path by using
 * kibana's `getUrlForApp()`
 *
 * @param managementPath
 */
export const useManagementFormatUrl = (managementPath: string) => {
  return `${useKibana().services.application.getUrlForApp(MANAGEMENT_APP_ID)}${managementPath}`;
};
