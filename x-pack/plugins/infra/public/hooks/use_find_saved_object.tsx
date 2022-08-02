/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { SavedObjectAttributes, SavedObjectsBatchResponse } from '@kbn/core/public';
import { useUiTracker } from '@kbn/observability-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const useFindSavedObject = <SavedObjectType extends SavedObjectAttributes>(type: string) => {
  const trackMetric = useUiTracker({ app: 'infra_metrics' });
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
            page: 1,
            perPage: 1000,
          });
          setError(null);
          setLoading(false);
          setData(d);
          if (d.total > 1000) {
            trackMetric({ metric: `over_1000_saved_objects_for_${type}` });
          } else {
            trackMetric({ metric: `under_1000_saved_objects_for_${type}` });
          }
        } catch (e) {
          setLoading(false);
          setError(e);
        }
      };
      fetchData();
    },
    [type, kibana.services.savedObjects, trackMetric]
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
