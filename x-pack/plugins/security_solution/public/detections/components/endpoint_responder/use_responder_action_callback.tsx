/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import React, { memo, useCallback, useMemo } from 'react';
import type {
  KillOrSuspendProcessRequestBody,
  ResponseActionApiResponse,
} from '../../../../common/endpoint/types';
import { suspendProcess } from '../../../common/lib/process_actions';
import { useGetEndpointDetails, useWithShowEndpointResponder } from '../../../management/hooks';

/**
 * Create kill process requests
 * @param customOptions
 */
export const useResponderActionCallback = (
    endpointId: string,
    onClick?: () => void,
) => {

    const showEndpointResponseActionsConsole = useWithShowEndpointResponder();

    const {
        data: endpointHostInfo,
        isFetching,
        error,
      } = useGetEndpointDetails(endpointId, { enabled: Boolean(endpointId) });
    
      console.log('HOST INFO.....', endpointHostInfo);
    
      return useCallback(() => {
        console.log('Firing.....', endpointHostInfo);
        if (endpointHostInfo) showEndpointResponseActionsConsole(endpointHostInfo.metadata);
        if (onClick) onClick();
      }, [endpointHostInfo, onClick, showEndpointResponseActionsConsole]);
};
