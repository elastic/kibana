/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useDispatch } from 'react-redux';
import { setAddingNewPrivateLocation } from '../../../../state/private_locations';
import {
  getSyntheticsPrivateLocations,
  setSyntheticsPrivateLocations,
} from '../../../../state/private_locations/api';
import { PrivateLocation } from '../../../../../../../common/runtime_types';

export const useLocationsAPI = () => {
  const [formData, setFormData] = useState<PrivateLocation>();
  const [deleteId, setDeleteId] = useState<string>();
  const [privateLocations, setPrivateLocations] = useState<PrivateLocation[]>([]);

  const { savedObjects } = useKibana().services;

  const dispatch = useDispatch();

  const setIsAddingNew = (val: boolean) => dispatch(setAddingNewPrivateLocation(val));

  const { loading: fetchLoading } = useFetcher(async () => {
    const result = await getSyntheticsPrivateLocations(savedObjects?.client!);
    setPrivateLocations(result);
    return result;
  }, []);

  const { loading: saveLoading } = useFetcher(async () => {
    if (privateLocations && formData) {
      const existingLocations = privateLocations.filter((loc) => loc.id !== formData.agentPolicyId);

      const result = await setSyntheticsPrivateLocations(savedObjects?.client!, {
        locations: [...(existingLocations ?? []), { ...formData, id: formData.agentPolicyId }],
      });
      setPrivateLocations(result.locations);
      setFormData(undefined);
      setIsAddingNew(false);
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
    formData,
    onSubmit,
    onDelete,
    deleteLoading: Boolean(deleteLoading),
    loading: Boolean(fetchLoading || saveLoading),
    privateLocations,
  };
};
