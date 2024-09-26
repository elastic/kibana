/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { ApmServiceInventory } from './apm_signal_inventory';
import { useEntityManagerEnablementContext } from '../../../context/entity_manager_context/use_entity_manager_enablement_context';

export function ServiceInventory() {
  const { isEnablementPending } = useEntityManagerEnablementContext();

  if (isEnablementPending) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo logo="logoObservability" size="xl" />}
        title={
          <h2>
            {i18n.translate('xpack.apm.loadingService', {
              defaultMessage: 'Loading services',
            })}
          </h2>
        }
      />
    );
  }

  return <ApmServiceInventory />;
}
