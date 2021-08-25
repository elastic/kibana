/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';

import {
  DEFAULT_INDEX_PATTERN,
  DEFAULT_INDEX_PATTERN_EXPERIMENTAL,
} from '../../../../../common/constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { TimelineId } from '../../../../../common/types/timeline';
import { inputsModel } from '../../../../common/store';

interface UseExceptionModalProps {
  ruleIndex: string[] | null | undefined;
  refetch?: inputsModel.Refetch;
  timelineId: string;
}
interface UseExceptionModal {
  exceptionModalType: ExceptionListType | null;
  onAddExceptionTypeClick: (type: ExceptionListType) => void;
  onAddExceptionCancel: () => void;
  onAddExceptionConfirm: (didCloseAlert: boolean, didBulkCloseAlert: boolean) => void;
  ruleIndices: string[];
}

export const useExceptionModal = ({
  ruleIndex,
  refetch,
  timelineId,
}: UseExceptionModalProps): UseExceptionModal => {
  const [exceptionModalType, setOpenAddExceptionModal] = useState<ExceptionListType | null>(null);

  // TODO: Steph/ueba remove when past experimental
  const uebaEnabled = useIsExperimentalFeatureEnabled('uebaEnabled');

  const ruleIndices = useMemo((): string[] => {
    if (ruleIndex != null) {
      return ruleIndex;
    } else {
      return uebaEnabled
        ? [...DEFAULT_INDEX_PATTERN, ...DEFAULT_INDEX_PATTERN_EXPERIMENTAL]
        : DEFAULT_INDEX_PATTERN;
    }
  }, [ruleIndex, uebaEnabled]);

  const onAddExceptionTypeClick = useCallback((exceptionListType: ExceptionListType): void => {
    setOpenAddExceptionModal(exceptionListType);
  }, []);

  const onAddExceptionCancel = useCallback(() => {
    setOpenAddExceptionModal(null);
  }, []);

  const onAddExceptionConfirm = useCallback(
    (didCloseAlert: boolean, didBulkCloseAlert) => {
      if (refetch && (timelineId !== TimelineId.active || didBulkCloseAlert)) {
        refetch();
      }
      setOpenAddExceptionModal(null);
    },
    [refetch, timelineId]
  );

  return {
    exceptionModalType,
    onAddExceptionTypeClick,
    onAddExceptionCancel,
    onAddExceptionConfirm,
    ruleIndices,
  };
};
