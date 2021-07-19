/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';

import { Ecs } from '../../../../../common/ecs';
import {
  DEFAULT_INDEX_PATTERN,
  DEFAULT_INDEX_PATTERN_EXPERIMENTAL,
} from '../../../../../common/constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { TimelineId } from '../../../../../common/types/timeline';
import { inputsModel } from '../../../../common/store';

interface UseExceptionModalProps {
  exceptionModalType: ExceptionListType | null;
  ruleId: string | null;
  ruleName: string;
  ruleIndices: string[];
  alertStatus: Status | undefined;
  handleOpenExceptionModal: (exceptionListType: ExceptionListType) => void;
  onAddExceptionCancel: () => void;
  onAddExceptionConfirm: (didCloseAlert: boolean, didBulkCloseAlert: boolean) => void;
}

export const useExceptionModal = ({
  ecsRowData,
  refetch,
  timelineId,
}: {
  ecsRowData: Ecs;
  refetch: inputsModel.Refetch;
  timelineId: string;
}): UseExceptionModalProps => {
  const [exceptionModalType, setOpenAddExceptionModal] = useState<ExceptionListType | null>(null);

  // TODO: Steph/ueba remove when past experimental
  const uebaEnabled = useIsExperimentalFeatureEnabled('uebaEnabled');

  const ruleId = useMemo(
    (): string | null =>
      (ecsRowData.signal?.rule && ecsRowData.signal.rule.id && ecsRowData.signal.rule.id[0]) ??
      null,
    [ecsRowData]
  );
  const ruleName = useMemo(
    (): string =>
      (ecsRowData.signal?.rule && ecsRowData.signal.rule.name && ecsRowData.signal.rule.name[0]) ??
      '',
    [ecsRowData]
  );

  const ruleIndices = useMemo((): string[] => {
    if (
      ecsRowData.signal?.rule &&
      ecsRowData.signal.rule.index &&
      ecsRowData.signal.rule.index.length > 0
    ) {
      return ecsRowData.signal.rule.index;
    } else {
      return uebaEnabled
        ? [...DEFAULT_INDEX_PATTERN, ...DEFAULT_INDEX_PATTERN_EXPERIMENTAL]
        : DEFAULT_INDEX_PATTERN;
    }
  }, [ecsRowData.signal?.rule, uebaEnabled]);

  const alertStatus = useMemo(() => {
    return ecsRowData.signal?.status && (ecsRowData.signal.status[0] as Status);
  }, [ecsRowData]);

  const closeAddExceptionModal = useCallback((): void => {
    setOpenAddExceptionModal(null);
  }, []);

  const handleOpenExceptionModal = useCallback((exceptionListType: ExceptionListType): void => {
    setOpenAddExceptionModal(exceptionListType);
  }, []);

  const onAddExceptionCancel = useCallback(() => {
    closeAddExceptionModal();
  }, [closeAddExceptionModal]);

  const onAddExceptionConfirm = useCallback(
    (didCloseAlert: boolean, didBulkCloseAlert) => {
      closeAddExceptionModal();
      if (timelineId !== TimelineId.active || didBulkCloseAlert) {
        refetch();
      }
    },
    [closeAddExceptionModal, refetch, timelineId]
  );

  return {
    exceptionModalType,
    ruleId,
    ruleName,
    ruleIndices,
    alertStatus,
    handleOpenExceptionModal,
    onAddExceptionCancel,
    onAddExceptionConfirm,
  };
};
