/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/public';
import { useQuery } from 'react-query';
import { useKibana } from '../common/lib/kibana';
import { INTEGRATION_ASSETS_STATUS_ID } from './constants';

export const useAssetsStatus = () => {
  const { http } = useKibana().services;

  return useQuery<{ install: SavedObject[]; update: SavedObject[]; upToDate: SavedObject[] }>(
    [INTEGRATION_ASSETS_STATUS_ID],
    () => http.get('/internal/osquery/assets'),
    {
      keepPreviousData: true,
    }
  );
};
