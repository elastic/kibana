/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';

import { KibanaContext, IKibanaContext } from '../../../../index';

export const useRoutes = () => {
  const { enterpriseSearchUrl } = useContext(KibanaContext) as IKibanaContext;
  const getWSRoute = (path: string): string => `${enterpriseSearchUrl}/ws${path}`;
  return { getWSRoute };
};
