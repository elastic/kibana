/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback } from 'react';
import { SavedObjectsBatchResponse } from 'src/core/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';

export const useBulkGetSavedObject = (type: string) => {
  const kibana = useKibana();
  // TODO: define saved object type
  const [data, setData] = useState<SavedObjectsBatchResponse<any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const bulkGet = useCallback(
    (ids: string[]) => {
      setLoading(true);
      const fetchData = async () => {
        try {
          const savedObjectsClient = kibana.services.savedObjects?.client;
          if (!savedObjectsClient) {
            throw new Error('Saved objects client is unavailable');
          }
          const d = await savedObjectsClient.bulkGet(ids.map((i) => ({ type, id: i })));
          setError(null);
          setLoading(false);
          setData(d);
        } catch (e) {
          setLoading(false);
          setError(e);
        }
      };
      fetchData();
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [type, kibana.services.savedObjects]
  );

  return {
    data,
    loading,
    error,
    bulkGet,
  };
};
