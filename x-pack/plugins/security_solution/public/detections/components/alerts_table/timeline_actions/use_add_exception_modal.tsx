/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';

import { getOr } from 'lodash/fp';
import { Ecs } from '../../../../../common/ecs';
import {
  DEFAULT_INDEX_PATTERN,
  DEFAULT_INDEX_PATTERN_EXPERIMENTAL,
} from '../../../../../common/constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { TimelineId } from '../../../../../common/types/timeline';
import { inputsModel } from '../../../../common/store';
import { useUserData } from '../../user_info';
import { ACTION_ADD_ENDPOINT_EXCEPTION, ACTION_ADD_EXCEPTION } from '../translations';

interface UseExceptionModalProps {
  ecsData: Ecs | null | undefined;
  refetch?: inputsModel.Refetch;
  timelineId: string;
}
interface UseExceptionModal {
  alertStatus: Status | undefined;
  exceptionModalType: ExceptionListType | null;
  ruleId: string | null;
  ruleName: string;
  ruleIndices: string[];
  onAddExceptionTypeClick: (type: ExceptionListType) => void;
  onAddExceptionCancel: () => void;
  onAddExceptionConfirm: (didCloseAlert: boolean, didBulkCloseAlert: boolean) => void;
}

export const useExceptionModal = ({
  ecsData,
  refetch,
  timelineId,
}: UseExceptionModalProps): UseExceptionModal => {
  const [exceptionModalType, setOpenAddExceptionModal] = useState<ExceptionListType | null>(null);

  // TODO: Steph/ueba remove when past experimental
  const uebaEnabled = useIsExperimentalFeatureEnabled('uebaEnabled');

  const ruleId = useMemo(
    (): string | null =>
      (ecsData?.signal?.rule && ecsData.signal.rule.id && ecsData.signal.rule.id[0]) ?? null,
    [ecsData]
  );
  const ruleName = useMemo(
    (): string =>
      (ecsData?.signal?.rule && ecsData.signal.rule.name && ecsData.signal.rule.name[0]) ?? '',
    [ecsData]
  );

  const ruleIndices = useMemo((): string[] => {
    if (
      ecsData?.signal?.rule &&
      ecsData.signal.rule.index &&
      ecsData.signal.rule.index.length > 0
    ) {
      return ecsData?.signal.rule.index;
    } else {
      return uebaEnabled
        ? [...DEFAULT_INDEX_PATTERN, ...DEFAULT_INDEX_PATTERN_EXPERIMENTAL]
        : DEFAULT_INDEX_PATTERN;
    }
  }, [ecsData, uebaEnabled]);

  const alertStatus = useMemo(() => {
    return ecsData?.signal?.status && (ecsData?.signal.status[0] as Status);
  }, [ecsData]);

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
    alertStatus,
    exceptionModalType,
    ruleId,
    ruleName,
    ruleIndices,
    onAddExceptionTypeClick,
    onAddExceptionCancel,
    onAddExceptionConfirm,
  };
};

interface UseExceptionAction {
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
}: UseExceptionActionProps): UseExceptionAction[] => {
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
