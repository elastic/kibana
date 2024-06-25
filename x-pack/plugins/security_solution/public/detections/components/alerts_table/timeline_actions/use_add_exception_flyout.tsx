/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import type { inputsModel } from '../../../../common/store';
import { useTourContext } from '../../../../common/components/guided_onboarding_tour';

interface UseExceptionFlyoutProps {
  refetch?: inputsModel.Refetch;
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
  onRuleChange,
  isActiveTimelines,
}: UseExceptionFlyoutProps): UseExceptionFlyout => {
  const { setAllTourStepsHidden } = useTourContext();
  const [openAddExceptionFlyout, setOpenAddExceptionFlyout] = useState<boolean>(false);
  const [exceptionFlyoutType, setExceptionFlyoutType] = useState<ExceptionListTypeEnum | null>(
    null
  );

  const onAddExceptionTypeClick = useCallback(
    (exceptionListType?: ExceptionListTypeEnum): void => {
      setExceptionFlyoutType(exceptionListType ?? null);
      setAllTourStepsHidden(true);
      setOpenAddExceptionFlyout(true);
    },
    [setAllTourStepsHidden]
  );

  const onAddExceptionCancel = useCallback(() => {
    setExceptionFlyoutType(null);
    setAllTourStepsHidden(false);
    setOpenAddExceptionFlyout(false);
  }, [setAllTourStepsHidden]);

  const onAddExceptionConfirm = useCallback(
    (didRuleChange: boolean, didCloseAlert: boolean, didBulkCloseAlert) => {
      if (refetch && (isActiveTimelines === false || didBulkCloseAlert)) {
        refetch();
      }
      if (onRuleChange != null && didRuleChange) {
        onRuleChange();
      }
      setAllTourStepsHidden(false);
      setOpenAddExceptionFlyout(false);
    },
    [refetch, isActiveTimelines, onRuleChange, setAllTourStepsHidden]
  );

  return {
    exceptionFlyoutType,
    openAddExceptionFlyout,
    onAddExceptionTypeClick,
    onAddExceptionCancel,
    onAddExceptionConfirm,
  };
};
