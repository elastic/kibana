/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useKibana } from '../../../../lib/kibana';
import type { CardId, SectionId, CheckIfStepCompleted, ToggleTaskCompleteStatus } from '../types';

interface Props {
  autoCheckIfCardCompleted?: CheckIfStepCompleted;
  cardId: CardId;
  cardTitle?: string;
  indicesExist: boolean;
  sectionId: SectionId;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
}

export const useCheckStepCompleted = ({
  autoCheckIfCardCompleted,
  cardId,
  cardTitle,
  indicesExist,
  sectionId,
  toggleTaskCompleteStatus,
}: Props) => {
  const {
    http: kibanaServicesHttp,
    notifications: { toasts },
  } = useKibana().services;
  const addError = useRef(toasts.addError.bind(toasts)).current;

  useEffect(() => {
    if (!autoCheckIfCardCompleted) {
      return;
    }

    const abortSignal = new AbortController();
    const autoCheckStepCompleted = async () => {
      const isDone = await autoCheckIfCardCompleted({
        indicesExist,
        abortSignal,
        kibanaServicesHttp,
        onError: (error: Error) => {
          addError(error, { title: `Failed to check ${cardTitle ?? cardId} completion.` });
        },
      });

      if (!abortSignal.signal.aborted) {
        toggleTaskCompleteStatus({
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
    autoCheckIfCardCompleted,
    cardId,
    sectionId,
    toggleTaskCompleteStatus,
    kibanaServicesHttp,
    indicesExist,
    addError,
    cardTitle,
  ]);
};
