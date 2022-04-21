/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';

import { FlyoutTypes, useSecurityFlyout } from '../../flyouts';
import { DEFAULT_INDEX_PATTERN } from '../../../../../common/constants';
import { TimelineId } from '../../../../../common/types/timeline';
import { inputsModel } from '../../../../common/store';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';

export interface AddExceptionModalWrapperData {
  alertStatus?: Status;
  eventId: string;
  ruleId?: string;
  ruleName?: string;
  onRuleChange?: () => void;
}

interface UseExceptionFlyoutProps {
  ruleIndex: string[] | null | undefined;
  refetch?: inputsModel.Refetch;
  timelineId: string;
  addExceptionModalWrapperData: AddExceptionModalWrapperData;
}

interface UseExceptionFlyout {
  onAddExceptionTypeClick: (type: ExceptionListType) => void;
}

export const useExceptionFlyout = ({
  ruleIndex,
  refetch,
  timelineId,
  addExceptionModalWrapperData,
}: UseExceptionFlyoutProps): UseExceptionFlyout => {
  const { flyoutDispatch } = useSecurityFlyout();

  const ruleIndices = useMemo((): string[] => {
    if (ruleIndex != null) {
      return ruleIndex;
    } else {
      return DEFAULT_INDEX_PATTERN;
    }
  }, [ruleIndex]);

  const onAddExceptionCancel = useCallback(() => {
    flyoutDispatch({ type: null });
  }, [flyoutDispatch]);

  const onAddExceptionConfirm = useCallback(
    (didCloseAlert: boolean, didBulkCloseAlert) => {
      if (refetch && (timelineId !== TimelineId.active || didBulkCloseAlert)) {
        refetch();
      }
      flyoutDispatch({ type: null });
    },
    [flyoutDispatch, refetch, timelineId]
  );

  const onAddExceptionTypeClick = useCallback(
    (exceptionListType: ExceptionListType): void => {
      if (
        addExceptionModalWrapperData.ruleId != null &&
        addExceptionModalWrapperData.eventId != null
      ) {
        flyoutDispatch({
          type: FlyoutTypes.ADD_EXCEPTION,
          payload: {
            exceptionFlyoutType: exceptionListType,
            addExceptionModalWrapperData,
            onAddExceptionCancel,
            onAddExceptionConfirm,
            ruleIndices,
          },
        });
      }
    },
    [
      addExceptionModalWrapperData,
      flyoutDispatch,
      onAddExceptionCancel,
      onAddExceptionConfirm,
      ruleIndices,
    ]
  );

  return {
    onAddExceptionTypeClick,
  };
};
