/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { PrivateLocation } from '../../../../../../common/runtime_types';
import {
  setSyntheticsPrivateLocations,
  getSyntheticsPrivateLocations,
} from '../../../../state/private_locations/api';

export const useLocationsAPI = () => {
  const [formData, setFormData] = useState<PrivateLocation>();
  const [deleteId, setDeleteId] = useState<string>();

  const { savedObjects } = useKibana().services;

  const { data: currentPrivateLocations, loading: fetchLoading } = useFetcher(() => {
    if (!formData) return getSyntheticsPrivateLocations(savedObjects?.client!);
    return Promise.resolve(null);
  }, [formData, deleteId]);

  const { loading } = useFetcher(async () => {
    if (currentPrivateLocations && formData) {
      const result = await setSyntheticsPrivateLocations(savedObjects?.client!, {
        locations: [
          ...(currentPrivateLocations ?? []),
          { ...formData, id: String((currentPrivateLocations?.length ?? 0) + 1) },
        ],
      });
      setFormData(undefined);
      return result;
    }
    return Promise.resolve(null);
  }, [formData, currentPrivateLocations]);

  const onSubmit = (data: PrivateLocation) => {
    setFormData(data);
  };

  const onDelete = (id: string) => {
    setDeleteId(id);
  };

  const { loading: deleteLoading } = useFetcher(async () => {
    if (deleteId) {
      const result = await setSyntheticsPrivateLocations(savedObjects?.client!, {
        locations: (currentPrivateLocations ?? []).filter((loc) => loc.id !== deleteId),
      });
      setDeleteId(undefined);
      return result;
    }
    return Promise.resolve(null);
  }, [deleteId, currentPrivateLocations]);

  return {
    loading: Boolean(loading || deleteLoading || fetchLoading),
    onSubmit,
    onDelete,
    privateLocations: currentPrivateLocations ?? [],
  };
};
