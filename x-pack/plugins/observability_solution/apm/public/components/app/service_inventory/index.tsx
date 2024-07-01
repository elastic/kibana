/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { isEmpty } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { apmEnableMultiSignal } from '@kbn/observability-plugin/common';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { ApmServiceInventory } from './apm_signal_inventory';
import { MultiSignalInventory } from './multi_signal_inventory';
import { useApmParams } from '../../../hooks/use_apm_params';
import { ApmPluginStartDeps } from '../../../plugin';
import { useEntityManager } from '../../../hooks/use_entity_manager';

export function ServiceInventory() {
  const [isEntityDiscoveryEnabled] = useEntityManager();

  const {
    query: { serviceGroup },
  } = useApmParams('/services');

  return isEntityDiscoveryEnabled && isEmpty(serviceGroup) ? (
    <MultiSignalInventory />
  ) : (
    <ApmServiceInventory />
  );
}
