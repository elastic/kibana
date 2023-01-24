/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { PrivateLocationsTable } from './locations_table';
import { ClientPluginsStart } from '../../../../../plugin';
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
import { NEED_FLEET_READ_AGENT_POLICIES_PERMISSION, NEED_PERMISSIONS } from './translations';

export const ManagePrivateLocations = () => {
  const dispatch = useDispatch();

  const isAddingNew = useSelector(selectAddingNewPrivateLocation);

  const setIsAddingNew = (val: boolean) => dispatch(setAddingNewPrivateLocation(val));

  const { onSubmit, loading, privateLocations, onDelete, deleteLoading } = useLocationsAPI();

  const { fleet } = useKibana<ClientPluginsStart>().services;

  const hasFleetPermissions = Boolean(fleet?.authz.fleet.readAgentPolicies);

  useEffect(() => {
    dispatch(getAgentPoliciesAction.get());
    dispatch(getServiceLocations());
  }, [dispatch]);

  const handleSubmit = (formData: PrivateLocation) => {
    onSubmit(formData);
  };

  return (
    <>
      {loading ? (
        <LoadingState />
      ) : (
        <ManageEmptyState
          privateLocations={privateLocations}
          setIsAddingNew={setIsAddingNew}
          hasFleetPermissions={hasFleetPermissions}
        >
          <PrivateLocationsTable
            privateLocations={privateLocations}
            onDelete={onDelete}
            deleteLoading={deleteLoading}
          />
        </ManageEmptyState>
      )}
      {!hasFleetPermissions && (
        <EuiCallOut title={NEED_PERMISSIONS} color="warning" iconType="help">
          <p>{NEED_FLEET_READ_AGENT_POLICIES_PERMISSION}</p>
        </EuiCallOut>
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
