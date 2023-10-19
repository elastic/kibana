/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useListsConfig } from '../../../detections/containers/detection_engine/lists/use_lists_config';
import { useHasSecurityCapability } from '../../../helper_hooks';

export const useEndpointExceptionsCapability = (
  capability: 'showEndpointExceptions' | 'crudEndpointExceptions'
) => {
  const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
    useListsConfig();
  const hasEndpointExceptionCapability = useHasSecurityCapability(capability);

  return useMemo(
    () => !listsConfigLoading && !needsListsConfiguration && hasEndpointExceptionCapability,
    [hasEndpointExceptionCapability, listsConfigLoading, needsListsConfiguration]
  );
};
