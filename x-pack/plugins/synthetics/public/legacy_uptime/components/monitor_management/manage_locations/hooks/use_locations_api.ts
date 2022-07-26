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

export const useLocationsAPI = ({ isOpen }: { isOpen: boolean }) => {
  const [formData, setFormData] = useState<PrivateLocation>();
  const [deleteId, setDeleteId] = useState<string>();
  const [privateLocations, setPrivateLocations] = useState<PrivateLocation[]>([]);

  const { savedObjects } = useKibana().services;

  const { loading: fetchLoading } = useFetcher(async () => {
    const result = await getSyntheticsPrivateLocations(savedObjects?.client!);
    setPrivateLocations(result);
    return result;
  }, [isOpen]);

  const { loading: saveLoading } = useFetcher(async () => {
    if (privateLocations && formData) {
      const existingLocations = privateLocations.filter((loc) => loc.id !== formData.agentPolicyId);

      const result = await setSyntheticsPrivateLocations(savedObjects?.client!, {
        locations: [...(existingLocations ?? []), { ...formData, id: formData.agentPolicyId }],
      });
      setPrivateLocations(result.locations);
      setFormData(undefined);
      return result;
    }
  }, [formData, privateLocations]);

  const onSubmit = (data: PrivateLocation) => {
    setFormData(data);
  };

  const onDelete = (id: string) => {
    setDeleteId(id);
  };

  const { loading: deleteLoading } = useFetcher(async () => {
    if (deleteId) {
      const result = await setSyntheticsPrivateLocations(savedObjects?.client!, {
        locations: (privateLocations ?? []).filter((loc) => loc.id !== deleteId),
      });
      setPrivateLocations(result.locations);
      setDeleteId(undefined);
      return result;
    }
  }, [deleteId, privateLocations]);

  return {
    onSubmit,
    onDelete,
    loading: fetchLoading || saveLoading || deleteLoading,
    privateLocations,
  };
};
