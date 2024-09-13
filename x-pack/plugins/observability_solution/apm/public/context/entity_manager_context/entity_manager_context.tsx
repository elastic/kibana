/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ManagedEntityEnabledResponse } from '@kbn/entityManager-plugin/common/types_api';
import { entityCentricExperience } from '@kbn/observability-plugin/common';
import { useAbortableAsync } from '@kbn/observability-utils/hooks/use_abortable_async';
import React, { createContext } from 'react';
import {
  SERVICE_INVENTORY_STORAGE_KEY,
  serviceInventoryViewType$,
} from '../../analytics/register_service_inventory_view_type_context';
import { useLocalStorage } from '../../hooks/use_local_storage';
import { ApmPluginStartDeps, ApmServices } from '../../plugin';
import { useApmPluginContext } from '../apm_plugin/use_apm_plugin_context';
import { useKibana } from '../kibana_context/use_kibana';

export interface EntityManagerEnablementContextValue {
  isEntityManagerEnabled: boolean;
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

const INITIAL_STATE: ManagedEntityEnabledResponse = {
  enabled: false,
  reason: '',
};

export function EntityManagerEnablementContextProvider({
  children,
}: {
  children: React.ReactChild;
}) {
  const { core } = useApmPluginContext();
  const { services } = useKibana<ApmPluginStartDeps & ApmServices>();
  const [tourState, setTourState] = useLocalStorage('apm.serviceEcoTour', TOUR_INITIAL_STATE);
  const [serviceInventoryViewLocalStorageSetting, setServiceInventoryViewLocalStorageSetting] =
    useLocalStorage(SERVICE_INVENTORY_STORAGE_KEY, ServiceInventoryView.classic);

  const isEntityCentricExperienceSettingEnabled = core.uiSettings.get<boolean>(
    entityCentricExperience,
    true
  );

  const {
    value: managedEntityDiscoveryData = INITIAL_STATE,
    loading: managedEntityDiscoveryLoading,
    refresh,
  } = useAbortableAsync(() => {
    return services.entityManager.entityClient.isManagedEntityDiscoveryEnabled();
  }, [services.entityManager.entityClient]);

  const isEntityCentricExperienceViewEnabled =
    managedEntityDiscoveryData.enabled &&
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
        isEntityManagerEnabled: managedEntityDiscoveryData.enabled,
        isEnablementPending: managedEntityDiscoveryLoading,
        refetch: refresh,
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
