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

export const useCreateSavedObject = (type: string) => {
  const kibana = useKibana();
  const [data, setData] = useState<SimpleSavedObject<SavedObjectAttributes> | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const create = useCallback(
    (attributes: SavedObjectAttributes, options?: SavedObjectsCreateOptions) => {
      setLoading(true);
      const save = async () => {
        try {
          const savedObjectsClient = kibana.services.savedObjects?.client;
          if (!savedObjectsClient) {
            throw new Error('Saved objects client is unavailable');
          }
          const d = await savedObjectsClient.create(type, attributes, options);
          setCreatedId(d.id);
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
    [type, kibana.services.savedObjects]
  );

  return {
    data,
    loading,
    error,
    create,
    createdId,
  };
};
