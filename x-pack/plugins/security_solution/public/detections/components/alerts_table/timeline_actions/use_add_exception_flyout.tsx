/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { DEFAULT_INDEX_PATTERN } from '../../../../../common/constants';
import { TimelineId } from '../../../../../common/types/timeline';
import type { inputsModel } from '../../../../common/store';

interface UseExceptionFlyoutProps {
  ruleIndex: string[] | null | undefined;
  refetch?: inputsModel.Refetch;
  timelineId: string;
  onRuleChange?: () => void;
}
interface UseExceptionFlyout {
  exceptionFlyoutType: ExceptionListTypeEnum | null;
  openAddExceptionFlyout: boolean;
  ruleIndices: string[];
  onAddExceptionTypeClick: (type?: ExceptionListTypeEnum) => void;
  onAddExceptionCancel: (didRuleChange: boolean) => void;
  onAddExceptionConfirm: (
    didRuleChange: boolean,
    didCloseAlert: boolean,
    didBulkCloseAlert: boolean
  ) => void;
}

export const useExceptionFlyout = ({
  ruleIndex,
  refetch,
  timelineId,
  onRuleChange,
}: UseExceptionFlyoutProps): UseExceptionFlyout => {
  const [openAddExceptionFlyout, setOpenAddExceptionFlyout] = useState<boolean>(false);
  const [exceptionFlyoutType, setExceptionFlyoutType] = useState<ExceptionListTypeEnum | null>(
    null
  );

  const ruleIndices = useMemo((): string[] => {
    if (ruleIndex != null) {
      return ruleIndex;
    } else {
      return DEFAULT_INDEX_PATTERN;
    }
  }, [ruleIndex]);

  const onAddExceptionTypeClick = useCallback((exceptionListType?: ExceptionListTypeEnum): void => {
    setExceptionFlyoutType(exceptionListType ?? null);
    setOpenAddExceptionFlyout(true);
  }, []);

  const onAddExceptionCancel = useCallback(() => {
    setExceptionFlyoutType(null);
    setOpenAddExceptionFlyout(false);
  }, []);

  const onAddExceptionConfirm = useCallback(
    (didRuleChange: boolean, _: boolean, didBulkCloseAlert) => {
      if (refetch && (timelineId !== TimelineId.active || didBulkCloseAlert)) {
        refetch();
      }
      if (onRuleChange != null && didRuleChange) {
        onRuleChange();
      }
      setOpenAddExceptionFlyout(false);
    },
    [onRuleChange, refetch, timelineId]
  );

  return {
    exceptionFlyoutType,
    ruleIndices,
    openAddExceptionFlyout,
    onAddExceptionTypeClick,
    onAddExceptionCancel,
    onAddExceptionConfirm,
  };
};
