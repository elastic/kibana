/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback } from 'react';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';

export const useDeleteSavedObject = (type: string) => {
  const kibana = useKibana();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [deletedId, setDeletedId] = useState<string | null>(null);

  const deleteObject = useCallback(
    (id: string) => {
      setLoading(true);
      const dobj = async () => {
        try {
          await kibana.services.savedObjects?.client.delete(type, id);
          setError(null);
          setDeletedId(id);
          setLoading(false);
        } catch (e) {
          setLoading(false);
          setError(e);
        }
      };
      dobj();
    },
    [type, kibana.services.savedObjects]
  );

  return {
    loading,
    error,
    deleteObject,
    deletedId,
  };
};
