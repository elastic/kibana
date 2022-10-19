/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { TimelineId } from '../../../../../common/types/timeline';
import type { inputsModel } from '../../../../common/store';

interface UseExceptionFlyoutProps {
  refetch?: inputsModel.Refetch;
  timelineId: string;
  onRuleChange?: () => void;
  isActiveTimelines: boolean;
}
interface UseExceptionFlyout {
  exceptionFlyoutType: ExceptionListTypeEnum | null;
  openAddExceptionFlyout: boolean;
  onAddExceptionTypeClick: (type?: ExceptionListTypeEnum) => void;
  onAddExceptionCancel: (didRuleChange: boolean) => void;
  onAddExceptionConfirm: (
    didRuleChange: boolean,
    didCloseAlert: boolean,
    didBulkCloseAlert: boolean
  ) => void;
}

export const useExceptionFlyout = ({
  refetch,
  timelineId,
  onRuleChange,
  isActiveTimelines,
}: UseExceptionFlyoutProps): UseExceptionFlyout => {
  const [openAddExceptionFlyout, setOpenAddExceptionFlyout] = useState<boolean>(false);
  const [exceptionFlyoutType, setExceptionFlyoutType] = useState<ExceptionListTypeEnum | null>(
    null
  );

  const onAddExceptionTypeClick = useCallback((exceptionListType?: ExceptionListTypeEnum): void => {
    setExceptionFlyoutType(exceptionListType ?? null);
    setOpenAddExceptionFlyout(true);
  }, []);

  const onAddExceptionCancel = useCallback(() => {
    setExceptionFlyoutType(null);
    setOpenAddExceptionFlyout(false);
  }, []);

  const onAddExceptionConfirm = useCallback(
    (didRuleChange: boolean, didCloseAlert: boolean, didBulkCloseAlert) => {
      if (refetch && (timelineId !== TimelineId.active || didBulkCloseAlert)) {
        refetch();
      }
      if (onRuleChange != null && didRuleChange) {
        onRuleChange();
      }
      setOpenAddExceptionFlyout(false);
    },
    [onRuleChange, refetch, timelineId, isActiveTimelines]
  );

  return {
    exceptionFlyoutType,
    openAddExceptionFlyout,
    onAddExceptionTypeClick,
    onAddExceptionCancel,
    onAddExceptionConfirm,
  };
};
