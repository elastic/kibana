/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';

import { useUserData } from '../../user_info';
import { ACTION_ADD_ENDPOINT_EXCEPTION, ACTION_ADD_EXCEPTION } from '../translations';

interface UseExceptionActions {
  name: string;
  onClick: () => void;
  disabled: boolean;
}

interface UseExceptionActionProps {
  isEndpointAlert: boolean;
  onAddExceptionTypeClick: (type: ExceptionListType) => void;
}

export const useExceptionActions = ({
  isEndpointAlert,
  onAddExceptionTypeClick,
}: UseExceptionActionProps): UseExceptionActions[] => {
  const [{ canUserCRUD, hasIndexWrite }] = useUserData();

  const handleDetectionExceptionModal = useCallback(() => {
    onAddExceptionTypeClick('detection');
  }, [onAddExceptionTypeClick]);

  const handleEndpointExceptionModal = useCallback(() => {
    onAddExceptionTypeClick('endpoint');
  }, [onAddExceptionTypeClick]);

  const disabledAddEndpointException = !canUserCRUD || !hasIndexWrite || !isEndpointAlert;
  const disabledAddException = !canUserCRUD || !hasIndexWrite;

  const exceptionActions = useMemo(
    () => [
      {
        name: ACTION_ADD_ENDPOINT_EXCEPTION,
        onClick: handleEndpointExceptionModal,
        disabled: disabledAddEndpointException,
        [`data-test-subj`]: 'add-endpoint-exception-menu-item',
      },
      {
        name: ACTION_ADD_EXCEPTION,
        onClick: handleDetectionExceptionModal,
        disabled: disabledAddException,
        [`data-test-subj`]: 'add-exception-menu-item',
      },
    ],
    [
      disabledAddEndpointException,
      disabledAddException,
      handleDetectionExceptionModal,
      handleEndpointExceptionModal,
    ]
  );

  return exceptionActions;
};
