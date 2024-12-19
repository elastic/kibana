/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InferenceServices } from '@kbn/inference-endpoint-ui-common';
import { type ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';

import { useProviders } from './providers/get_providers';

const InferenceAPIConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const { data: providers, isLoading } = useProviders(http, toasts);

  /* useEffect(() => {
    if (config?.provider && isEdit) {
      const newProvider = providers?.find((p) => p.service === config.provider);
      // Update connector providerSchema
      const newProviderSchema = Object.keys(newProvider?.configurations ?? {}).map((k) => ({
        key: k,
        isValid: true,
        ...newProvider?.configurations[k],
      })) as ConfigEntryView[];

      setProviderSchema(newProviderSchema);
    }
  }, [config?.provider, config?.taskType, http, isEdit, providers]);

*/

  return !isLoading ? <InferenceServices providers={providers ?? []} /> : null;
};

// eslint-disable-next-line import/no-default-export
export { InferenceAPIConnectorFields as default };
