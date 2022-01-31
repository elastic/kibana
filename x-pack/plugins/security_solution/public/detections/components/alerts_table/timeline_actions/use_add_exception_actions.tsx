/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';

import { useUserData } from '../../user_info';
import { ACTION_ADD_ENDPOINT_EXCEPTION, ACTION_ADD_EXCEPTION } from '../translations';

interface UseExceptionActionProps {
  isEndpointAlert: boolean;
  onAddExceptionTypeClick: (type: ExceptionListType) => void;
}

export const useExceptionActions = ({
  isEndpointAlert,
  onAddExceptionTypeClick,
}: UseExceptionActionProps) => {
  const [{ canUserCRUD, hasIndexWrite }] = useUserData();

  const handleDetectionExceptionModal = useCallback(() => {
    onAddExceptionTypeClick('detection');
  }, [onAddExceptionTypeClick]);

  const handleEndpointExceptionModal = useCallback(() => {
    onAddExceptionTypeClick('endpoint');
  }, [onAddExceptionTypeClick]);

  const disabledAddEndpointException = !canUserCRUD || !hasIndexWrite || !isEndpointAlert;
  const disabledAddException = !canUserCRUD || !hasIndexWrite;

  const exceptionActionItems = useMemo(
    () =>
      disabledAddException
        ? []
        : [
            <EuiContextMenuItem
              key="add-endpoint-exception-menu-item"
              data-test-subj="add-endpoint-exception-menu-item"
              disabled={disabledAddEndpointException}
              onClick={handleEndpointExceptionModal}
            >
              {ACTION_ADD_ENDPOINT_EXCEPTION}
            </EuiContextMenuItem>,

            <EuiContextMenuItem
              key="add-exception-menu-item"
              data-test-subj="add-exception-menu-item"
              disabled={disabledAddException}
              onClick={handleDetectionExceptionModal}
            >
              {ACTION_ADD_EXCEPTION}
            </EuiContextMenuItem>,
          ],
    [
      disabledAddEndpointException,
      disabledAddException,
      handleDetectionExceptionModal,
      handleEndpointExceptionModal,
    ]
  );

  return { exceptionActionItems };
};
