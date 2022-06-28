/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';

import { DEFAULT_INDEX_PATTERN } from '../../../../../common/constants';
import { TimelineId } from '../../../../../common/types/timeline';
import { inputsModel } from '../../../../common/store';

interface UseExceptionFlyoutProps {
  ruleIndex: string[] | null | undefined;
  refetch?: inputsModel.Refetch;
  timelineId: string;
}
interface UseExceptionFlyout {
  exceptionFlyoutType: ExceptionListType | null;
  onAddExceptionTypeClick: (type: ExceptionListType) => void;
  onAddExceptionCancel: () => void;
  onAddExceptionConfirm: (didCloseAlert: boolean, didBulkCloseAlert: boolean) => void;
  ruleIndices: string[];
}

export const useExceptionFlyout = ({
  ruleIndex,
  refetch,
  timelineId,
}: UseExceptionFlyoutProps): UseExceptionFlyout => {
  const [exceptionFlyoutType, setOpenAddExceptionFlyout] = useState<ExceptionListType | null>(null);

  const ruleIndices = useMemo((): string[] => {
    if (ruleIndex != null) {
      return ruleIndex;
    } else {
      return DEFAULT_INDEX_PATTERN;
    }
  }, [ruleIndex]);

  const onAddExceptionTypeClick = useCallback((exceptionListType: ExceptionListType): void => {
    setOpenAddExceptionFlyout(exceptionListType);
  }, []);

  const onAddExceptionCancel = useCallback(() => {
    setOpenAddExceptionFlyout(null);
  }, []);

  const onAddExceptionConfirm = useCallback(
    (didCloseAlert: boolean, didBulkCloseAlert) => {
      if (refetch && (timelineId !== TimelineId.active || didBulkCloseAlert)) {
        refetch();
      }
      setOpenAddExceptionFlyout(null);
    },
    [refetch, timelineId]
  );

  return {
    exceptionFlyoutType,
    onAddExceptionTypeClick,
    onAddExceptionCancel,
    onAddExceptionConfirm,
    ruleIndices,
  };
};
