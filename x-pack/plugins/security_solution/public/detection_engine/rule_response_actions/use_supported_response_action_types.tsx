/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import type { ResponseActionType } from './get_supported_response_actions';
import { getSupportedResponseActions, responseActionTypes } from './get_supported_response_actions';

export const useSupportedResponseActionTypes = () => {
  const [supportedResponseActionTypes, setSupportedResponseActionTypes] = useState<
    ResponseActionType[] | undefined
  >();

  const isEndpointEnabled = useIsExperimentalFeatureEnabled('endpointResponseActionsEnabled');

  const enabledFeatures = useMemo(
    () => ({
      endpoint: isEndpointEnabled,
    }),
    [isEndpointEnabled]
  );
  useEffect(() => {
    const supportedTypes = getSupportedResponseActions(responseActionTypes, enabledFeatures);
    setSupportedResponseActionTypes(supportedTypes);
  }, [isEndpointEnabled, enabledFeatures]);

  return supportedResponseActionTypes;
};
