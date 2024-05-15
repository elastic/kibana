/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { apmEnableMultiSignal } from '@kbn/observability-plugin/common';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { ApmServiceInventory } from './apm_signal_service_list';
import { MultiSignalServicesTable } from './multi_signal_service_list';

export const ServiceInventory = () => {
  const { core } = useApmPluginContext();
  const isMultiSignalEnabled = core.uiSettings.get<boolean>(apmEnableMultiSignal, false);

  return isMultiSignalEnabled ? <MultiSignalServicesTable /> : <ApmServiceInventory />;
};
