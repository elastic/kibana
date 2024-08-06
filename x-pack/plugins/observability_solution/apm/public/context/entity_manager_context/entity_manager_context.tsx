/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';
import { entityCentricExperience } from '@kbn/observability-plugin/common';
import { ENTITY_FETCH_STATUS, useEntityManager } from '../../hooks/use_entity_manager';
import { useLocalStorage } from '../../hooks/use_local_storage';
import { useApmPluginContext } from '../apm_plugin/use_apm_plugin_context';
import {
  SERVICE_INVENTORY_STORAGE_KEY,
  serviceInventoryViewType$,
} from '../../analytics/register_service_inventory_view_type_context';
import { useKibana } from '../kibana_context/use_kibana';
import { ApmPluginStartDeps, ApmServices } from '../../plugin';

export interface EntityManagerEnablementContextValue {
  isEntityManagerEnabled: boolean;
  entityManagerEnablementStatus: ENTITY_FETCH_STATUS;
  isEnablementPending: boolean;
  refetch: () => void;
  serviceInventoryViewLocalStorageSetting: ServiceInventoryView;
  setServiceInventoryViewLocalStorageSetting: (view: ServiceInventoryView) => void;
  isEntityCentricExperienceViewEnabled: boolean;
  tourState: TourState;
  updateTourState: (newState: Partial<TourState>) => void;
}

export enum ServiceInventoryView {
  classic = 'classic',
  entity = 'entity',
}

export const EntityManagerEnablementContext = createContext(
  {} as EntityManagerEnablementContextValue
);

interface TourState {
  isModalVisible?: boolean;
  isTourActive: boolean;
}
const TOUR_INITIAL_STATE: TourState = {
  isModalVisible: undefined,
  isTourActive: false,
};

export function EntityManagerEnablementContextProvider({
  children,
}: {
  children: React.ReactChild;
}) {
  const { core } = useApmPluginContext();
  const { services } = useKibana<ApmPluginStartDeps & ApmServices>();
  const { isEnabled: isEntityManagerEnabled, status, refetch } = useEntityManager();
  const [tourState, setTourState] = useLocalStorage('apm.serviceEcoTour', TOUR_INITIAL_STATE);

  const [serviceInventoryViewLocalStorageSetting, setServiceInventoryViewLocalStorageSetting] =
    useLocalStorage(SERVICE_INVENTORY_STORAGE_KEY, ServiceInventoryView.classic);

  const isEntityCentricExperienceSettingEnabled = core.uiSettings.get<boolean>(
    entityCentricExperience,
    false
  );

  const isEntityCentricExperienceViewEnabled =
    isEntityManagerEnabled &&
    serviceInventoryViewLocalStorageSetting === ServiceInventoryView.entity &&
    isEntityCentricExperienceSettingEnabled;

  function handleServiceInventoryViewChange(nextView: ServiceInventoryView) {
    setServiceInventoryViewLocalStorageSetting(nextView);
    // Updates the telemetry context variable every time the user switches views
    serviceInventoryViewType$.next({ serviceInventoryViewType: nextView });
    services.telemetry.reportEntityExperienceStatusChange({
      status: nextView === ServiceInventoryView.entity ? 'enabled' : 'disabled',
    });
  }

  function handleTourStateUpdate(newTourState: Partial<TourState>) {
    setTourState({ ...tourState, ...newTourState });
  }

  return (
    <EntityManagerEnablementContext.Provider
      value={{
        isEntityManagerEnabled,
        entityManagerEnablementStatus: status,
        isEnablementPending: status === ENTITY_FETCH_STATUS.LOADING,
        refetch,
        serviceInventoryViewLocalStorageSetting,
        setServiceInventoryViewLocalStorageSetting: handleServiceInventoryViewChange,
        isEntityCentricExperienceViewEnabled,
        tourState,
        updateTourState: handleTourStateUpdate,
      }}
    >
      {children}
    </EntityManagerEnablementContext.Provider>
  );
}
