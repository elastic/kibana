/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiSpacer } from '@elastic/eui';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { PrivateLocationsTable } from './locations_table';
import { useCanManagePrivateLocation } from '../../../hooks';
import { ManageEmptyState } from './manage_empty_state';
import { AddLocationFlyout } from './add_location_flyout';
import { useLocationsAPI } from './hooks/use_locations_api';
import {
  getAgentPoliciesAction,
  selectAddingNewPrivateLocation,
  setAddingNewPrivateLocation,
} from '../../../state/private_locations';
import { PrivateLocation } from '../../../../../../common/runtime_types';
import { getServiceLocations } from '../../../state';
import { FleetPermissionsCallout } from '../../common/components/permissions';

export const ManagePrivateLocations = () => {
  const dispatch = useDispatch();

  const isAddingNew = useSelector(selectAddingNewPrivateLocation);
  const setIsAddingNew = (val: boolean) => dispatch(setAddingNewPrivateLocation(val));

  const { onSubmit, loading, privateLocations, onDelete, deleteLoading } = useLocationsAPI();

  const canManagePrivateLocation = useCanManagePrivateLocation();

  useEffect(() => {
    dispatch(getAgentPoliciesAction.get());
    dispatch(getServiceLocations());
  }, [dispatch]);

  const handleSubmit = (formData: PrivateLocation) => {
    onSubmit(formData);
  };

  return (
    <>
      {!canManagePrivateLocation && (
        <>
          <FleetPermissionsCallout />
          <EuiSpacer />
        </>
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <ManageEmptyState
          privateLocations={privateLocations}
          setIsAddingNew={setIsAddingNew}
          hasFleetPermissions={canManagePrivateLocation}
        >
          <PrivateLocationsTable
            privateLocations={privateLocations}
            onDelete={onDelete}
            deleteLoading={deleteLoading}
          />
        </ManageEmptyState>
      )}

      {isAddingNew ? (
        <AddLocationFlyout
          setIsOpen={setIsAddingNew}
          onSubmit={handleSubmit}
          privateLocations={privateLocations}
          isLoading={loading}
        />
      ) : null}
    </>
  );
};
