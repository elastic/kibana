/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { getServiceLocations } from '../../../../state/service_locations';
import { setAddingNewPrivateLocation } from '../../../../state/private_locations';
import {
  addSyntheticsPrivateLocations,
  deleteSyntheticsPrivateLocations,
  getSyntheticsPrivateLocations,
} from '../../../../state/private_locations/api';
import { PrivateLocation } from '../../../../../../../common/runtime_types';

export const usePrivateLocationsAPI = () => {
  const [formData, setFormData] = useState<PrivateLocation>();
  const [deleteId, setDeleteId] = useState<string>();
  const [privateLocations, setPrivateLocations] = useState<PrivateLocation[]>([]);

  const dispatch = useDispatch();

  const setIsAddingNew = (val: boolean) => dispatch(setAddingNewPrivateLocation(val));

  const { loading: fetchLoading } = useFetcher(async () => {
    const result = await getSyntheticsPrivateLocations();
    setPrivateLocations(result.locations);
    return result;
  }, []);

  const { loading: saveLoading } = useFetcher(async () => {
    if (formData) {
      const result = await addSyntheticsPrivateLocations({
        ...formData,
        id: formData.agentPolicyId,
      });
      setPrivateLocations(result.locations);
      setFormData(undefined);
      setIsAddingNew(false);
      dispatch(getServiceLocations());
      return result;
    }
  }, [formData]);

  const onSubmit = (data: PrivateLocation) => {
    setFormData(data);
  };

  const onDelete = (id: string) => {
    setDeleteId(id);
  };

  const { loading: deleteLoading } = useFetcher(async () => {
    if (deleteId) {
      const result = await deleteSyntheticsPrivateLocations(deleteId);
      setPrivateLocations(result.locations);
      setDeleteId(undefined);
      dispatch(getServiceLocations());
      return result;
    }
  }, [deleteId]);

  return {
    formData,
    onSubmit,
    onDelete,
    deleteLoading: Boolean(deleteLoading),
    loading: Boolean(fetchLoading || saveLoading),
    privateLocations,
  };
};
