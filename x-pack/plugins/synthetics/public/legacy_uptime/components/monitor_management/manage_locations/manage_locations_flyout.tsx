/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiTitle,
  EuiSpacer,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ClientPluginsStart } from '../../../../plugin';
import { EmptyLocations } from './empty_locations';
import { getServiceLocations } from '../../../state/actions';
import { LocationForm } from './location_form';
import { PrivateLocationsList } from './locations_list';
import { useLocationsAPI } from './hooks/use_locations_api';
import {
  getAgentPoliciesAction,
  selectManageFlyoutOpen,
  setManageFlyoutOpen,
} from '../../../state/private_locations';

export const ManageLocationsFlyout = () => {
  const [isAddingNew, setIsAddingNew] = useState(false);

  const dispatch = useDispatch();

  const setIsOpen = (val: boolean) => dispatch(setManageFlyoutOpen(val));

  const isOpen = useSelector(selectManageFlyoutOpen);

  const { onSubmit, saveLoading, fetchLoading, deleteLoading, privateLocations, onDelete } =
    useLocationsAPI({
      isOpen,
    });

  const { fleet } = useKibana<ClientPluginsStart>().services;

  const hasFleetPermissions = Boolean(fleet?.authz.fleet.readAgentPolicies);

  const canSave: boolean = !!useKibana().services?.application?.capabilities.uptime.save;

  useEffect(() => {
    if (isOpen) {
      dispatch(getAgentPoliciesAction.get());
    }
  }, [dispatch, isOpen]);

  const closeFlyout = () => {
    setIsOpen(false);
    dispatch(getServiceLocations());
  };

  const flyout = (
    <EuiFlyout onClose={closeFlyout}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{MANAGE_PRIVATE_LOCATIONS}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {!hasFleetPermissions && (
          <EuiCallOut title={NEED_PERMISSIONS} color="warning" iconType="help">
            <p>{NEED_FLEET_READ_AGENT_POLICIES_PERMISSION}</p>
          </EuiCallOut>
        )}
        {privateLocations.length === 0 && !(saveLoading || fetchLoading) && !isAddingNew ? (
          <EmptyLocations setIsAddingNew={setIsAddingNew} disabled={!hasFleetPermissions} />
        ) : (
          <PrivateLocationsList
            privateLocations={privateLocations}
            loading={fetchLoading}
            onDelete={onDelete}
            onSubmit={onSubmit}
            hasFleetPermissions={hasFleetPermissions}
          />
        )}
        <EuiSpacer />
        {isAddingNew && (
          <LocationForm
            privateLocations={privateLocations}
            onSubmit={(val) => {
              onSubmit(val);
              setIsAddingNew(false);
            }}
            onDiscard={() => setIsAddingNew(false)}
          />
        )}
        {!isAddingNew && privateLocations.length > 0 && (
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={saveLoading || fetchLoading || deleteLoading}
                disabled={!hasFleetPermissions || !canSave}
                onClick={() => setIsAddingNew(true)}
              >
                {ADD_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              {CLOSE_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );

  return (
    <div>
      <EuiButtonEmpty onClick={() => setIsOpen(true)} iconType="visMapCoordinate">
        {MANAGE_PRIVATE_LOCATIONS}
      </EuiButtonEmpty>
      {isOpen ? flyout : null}
    </div>
  );
};

const MANAGE_PRIVATE_LOCATIONS = i18n.translate(
  'xpack.synthetics.monitorManagement.managePrivateLocations',
  {
    defaultMessage: 'Manage private locations',
  }
);

const CLOSE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.closeLabel', {
  defaultMessage: 'Close',
});

const ADD_LABEL = i18n.translate('xpack.synthetics.monitorManagement.addLocation', {
  defaultMessage: 'Add location',
});

const NEED_PERMISSIONS = i18n.translate('xpack.synthetics.monitorManagement.needPermissions', {
  defaultMessage: 'Need permissions',
});

const NEED_FLEET_READ_AGENT_POLICIES_PERMISSION = i18n.translate(
  'xpack.synthetics.monitorManagement.needFleetReadAgentPoliciesPermission',
  {
    defaultMessage:
      'You are not authorized to access Fleet. Fleet permissions are required to create new private locations.',
  }
);
