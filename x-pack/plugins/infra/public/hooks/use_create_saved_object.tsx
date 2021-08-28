/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';
import type { SavedObjectsCreateOptions } from '../../../../../src/core/public/saved_objects/saved_objects_client';
import { SimpleSavedObject } from '../../../../../src/core/public/saved_objects/simple_saved_object';
import type { SavedObjectAttributes } from '../../../../../src/core/types/saved_objects';
import { useKibana } from '../../../../../src/plugins/kibana_react/public/context/context';

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
