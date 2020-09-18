/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback } from 'react';
import {
  SavedObjectAttributes,
  SavedObjectsCreateOptions,
  SimpleSavedObject,
} from 'src/core/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';

export const useUpdateSavedObject = (type: string) => {
  const kibana = useKibana();
  const [data, setData] = useState<SimpleSavedObject<SavedObjectAttributes> | null>(null);
  const [updatedId, setUpdatedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const update = useCallback(
    (id: string, attributes: SavedObjectAttributes, options?: SavedObjectsCreateOptions) => {
      setLoading(true);
      const save = async () => {
        try {
          const savedObjectsClient = kibana.services.savedObjects?.client;
          if (!savedObjectsClient) {
            throw new Error('Saved objects client is unavailable');
          }
          const d = await savedObjectsClient.update(type, id, attributes, options);
          setUpdatedId(d.id);
          setError(null);
          setData(d);
          setLoading(false);
        } catch (e) {
          setLoading(false);
          setError(e);
        }
      };
      save();
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [type, kibana.services.savedObjects]
  );

  return {
    data,
    loading,
    error,
    update,
    updatedId,
  };
};
