/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';

import { getOr } from 'lodash/fp';
import { Ecs } from '../../../../../common/ecs';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { inputsModel } from '../../../../common/store';
import { useUserData } from '../../user_info';
import { ACTION_ADD_ENDPOINT_EXCEPTION, ACTION_ADD_EXCEPTION } from '../translations';

interface UseExceptionActions {
  name: string;
  onClick: () => void;
  disabled: boolean;
}

interface UseExceptionActionProps {
  ecsData?: Ecs;
  onAddExceptionTypeClick: (type: ExceptionListType) => void;
}

export const useExceptionActions = ({
  ecsData,
  onAddExceptionTypeClick,
}: UseExceptionActionProps): UseExceptionActions[] => {
  const [{ canUserCRUD, hasIndexWrite }] = useUserData();

  const handleDetectionExceptionModal = useCallback(() => {
    onAddExceptionTypeClick('detection');
  }, [onAddExceptionTypeClick]);

  const handleEndpointExceptionModal = useCallback(() => {
    onAddExceptionTypeClick('endpoint');
  }, [onAddExceptionTypeClick]);

  const isEndpointAlert = useMemo((): boolean => {
    if (ecsData == null) {
      return false;
    }

    const eventModules = getOr([], 'signal.original_event.module', ecsData);
    const kinds = getOr([], 'signal.original_event.kind', ecsData);

    return eventModules.includes('endpoint') && kinds.includes('alert');
  }, [ecsData]);

  const disabledAddEndpointException = !canUserCRUD || !hasIndexWrite || !isEndpointAlert;
  const disabledAddException = !canUserCRUD || !hasIndexWrite;

  const exceptionActions = useMemo(
    () => [
      {
        name: ACTION_ADD_ENDPOINT_EXCEPTION,
        onClick: handleEndpointExceptionModal,
        disabled: disabledAddEndpointException,
      },
      {
        name: ACTION_ADD_EXCEPTION,
        onClick: handleDetectionExceptionModal,
        disabled: disabledAddException,
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
