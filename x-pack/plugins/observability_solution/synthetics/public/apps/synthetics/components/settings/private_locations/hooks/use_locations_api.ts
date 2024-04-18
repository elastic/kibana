/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NewLocation } from '../add_location_flyout';
import { getServiceLocations } from '../../../../state/service_locations';
import {
  getPrivateLocationsAction,
  selectPrivateLocations,
  selectPrivateLocationsLoading,
  setAddingNewPrivateLocation,
} from '../../../../state/private_locations';
import {
  addSyntheticsPrivateLocations,
  deleteSyntheticsPrivateLocations,
} from '../../../../state/private_locations/api';

export const usePrivateLocationsAPI = () => {
  const [formData, setFormData] = useState<NewLocation>();
  const [deleteId, setDeleteId] = useState<string>();

  const dispatch = useDispatch();

  const setIsAddingNew = (val: boolean) => dispatch(setAddingNewPrivateLocation(val));
  const privateLocations = useSelector(selectPrivateLocations);
  const fetchLoading = useSelector(selectPrivateLocationsLoading);

  useEffect(() => {
    dispatch(getPrivateLocationsAction.get());
  }, [dispatch]);

  const { loading: saveLoading } = useFetcher(async () => {
    if (formData) {
      const result = await addSyntheticsPrivateLocations(formData);
      setFormData(undefined);
      setIsAddingNew(false);
      dispatch(getServiceLocations());
      dispatch(getPrivateLocationsAction.get());
      return result;
    }
  }, [formData]);

  const onSubmit = (data: NewLocation) => {
    setFormData(data);
  };

  const onDelete = (id: string) => {
    setDeleteId(id);
  };

  const { loading: deleteLoading } = useFetcher(async () => {
    if (deleteId) {
      const result = await deleteSyntheticsPrivateLocations(deleteId);
      setDeleteId(undefined);
      dispatch(getServiceLocations());
      dispatch(getPrivateLocationsAction.get());
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
