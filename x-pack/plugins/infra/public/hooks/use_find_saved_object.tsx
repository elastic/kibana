/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback } from 'react';
import { SavedObjectAttributes, SavedObjectsBatchResponse } from 'src/core/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';

export const useFindSavedObject = <SavedObjectType extends SavedObjectAttributes>(type: string) => {
  const kibana = useKibana();
  const [data, setData] = useState<SavedObjectsBatchResponse<SavedObjectType> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const find = useCallback(
    (query?: string, searchFields: string[] = []) => {
      setLoading(true);
      const fetchData = async () => {
        try {
          const savedObjectsClient = kibana.services.savedObjects?.client;
          if (!savedObjectsClient) {
            throw new Error('Saved objects client is unavailable');
          }
          const d = await savedObjectsClient.find<SavedObjectType>({
            type,
            search: query,
            searchFields,
          });
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

  const hasView = async (name: string) => {
    const savedObjectsClient = kibana.services.savedObjects?.client;
    if (!savedObjectsClient) {
      throw new Error('Saved objects client is unavailable');
    }
    const objects = await savedObjectsClient.find<SavedObjectType>({
      type,
    });
    return objects.savedObjects.find((o) => o.attributes.name === name);
  };

  return {
    hasView,
    data,
    loading,
    error,
    find,
  };
};
