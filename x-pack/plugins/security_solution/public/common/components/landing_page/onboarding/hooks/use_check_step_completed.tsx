/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useKibana } from '../../../../lib/kibana';
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
  stepTitle?: string;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
}

export const useCheckStepCompleted = ({
  autoCheckIfStepCompleted,
  cardId,
  indicesExist,
  sectionId,
  stepId,
  stepTitle,
  toggleTaskCompleteStatus,
}: Props) => {
  const {
    http: kibanaServicesHttp,
    notifications: { toasts },
  } = useKibana().services;
  const addError = useRef(toasts.addError.bind(toasts)).current;

  useEffect(() => {
    if (!autoCheckIfStepCompleted) {
      return;
    }

    const abortSignal = new AbortController();
    const autoCheckStepCompleted = async () => {
      const isDone = await autoCheckIfStepCompleted({
        indicesExist,
        abortSignal,
        kibanaServicesHttp,
        onError: (error: Error) => {
          addError(error, { title: `Failed to check ${stepTitle ?? stepId} completion.` });
        },
      });

      if (!abortSignal.signal.aborted) {
        toggleTaskCompleteStatus({
          stepId,
          cardId,
          sectionId,
          undo: !isDone,
          trigger: 'auto_check',
        });
      }
    };
    autoCheckStepCompleted();
    return () => {
      abortSignal.abort();
    };
  }, [
    autoCheckIfStepCompleted,
    stepId,
    cardId,
    sectionId,
    toggleTaskCompleteStatus,
    kibanaServicesHttp,
    indicesExist,
    addError,
    stepTitle,
  ]);
};
