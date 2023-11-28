/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useKibana } from '../../common/services';
import type {
  StepId,
  CardId,
  SectionId,
  CheckIfStepCompleted,
  ToggleTaskCompleteStatus,
} from '../types';

interface Props {
  autoCheckIfStepCompleted?: CheckIfStepCompleted;
  cardId: CardId;
  indicesExist: boolean;
  sectionId: SectionId;
  stepId: StepId;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
}

export const useCheckStepCompleted = ({
  autoCheckIfStepCompleted,
  cardId,
  indicesExist,
  sectionId,
  stepId,
  toggleTaskCompleteStatus,
}: Props) => {
  const kibanaServicesHttp = useKibana().services.http;
  const abortSignal = useRef(new AbortController());

  useEffect(() => {
    if (!autoCheckIfStepCompleted) {
      return;
    }

    const autoCheckStepCompleted = async () => {
      const isDone = await autoCheckIfStepCompleted({
        indicesExist,
        abortSignal,
        kibanaServicesHttp,
      });

      toggleTaskCompleteStatus({ stepId, cardId, sectionId, undo: !isDone });
    };
    autoCheckStepCompleted();
    const currentAbortController = abortSignal.current;
    return () => {
      currentAbortController.abort();
    };
  }, [
    autoCheckIfStepCompleted,
    stepId,
    cardId,
    sectionId,
    toggleTaskCompleteStatus,
    kibanaServicesHttp,
    indicesExist,
  ]);
};
