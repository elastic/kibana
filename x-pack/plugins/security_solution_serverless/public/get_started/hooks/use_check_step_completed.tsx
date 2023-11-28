/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSourcererDataView } from '@kbn/security-solution-plugin/public';
import { useCallback, useEffect, useRef } from 'react';
import { useKibana } from '../../common/services';
import { fetchRuleManagementFilters } from '../apis';
import type {
  StepId,
  CardId,
  SectionId,
  CheckIfStepCompleted,
  ToggleTaskCompleteStatus,
} from '../types';
import { AddIntegrationsSteps, EnablePrebuiltRulesSteps } from '../types';

interface Props {
  checkIfStepCompleted?: CheckIfStepCompleted;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
  stepId: StepId;
  cardId: CardId;
  sectionId: SectionId;
}

export const useCheckStepCompleted = ({
  checkIfStepCompleted,
  toggleTaskCompleteStatus,
  stepId,
  cardId,
  sectionId,
}: Props) => {
  const { indicesExist } = useSourcererDataView();
  const kibanaServicesHttp = useKibana().services.http;
  const abortSignal = useRef(new AbortController());

  const autoCheckStepCompleted = useCallback(async () => {
    if (checkIfStepCompleted == null) {
      return;
    }

    if (stepId === EnablePrebuiltRulesSteps.enablePrebuiltRules) {
      const ruleManagementFilters = await fetchRuleManagementFilters({
        http: kibanaServicesHttp,
        signal: abortSignal.current.signal,
      });
      const isRulesInstalled =
        ruleManagementFilters?.rules_summary?.custom_count > 0 ||
        ruleManagementFilters?.rules_summary?.prebuilt_installed_count > 0;
      const done = checkIfStepCompleted?.(isRulesInstalled);
      toggleTaskCompleteStatus({ stepId, cardId, sectionId, undo: !done });
    }

    if (stepId === AddIntegrationsSteps.connectToDataSources) {
      const done = checkIfStepCompleted?.(indicesExist);
      toggleTaskCompleteStatus({ stepId, cardId, sectionId, undo: !done });
    }
  }, [
    cardId,
    checkIfStepCompleted,
    indicesExist,
    kibanaServicesHttp,
    sectionId,
    stepId,
    toggleTaskCompleteStatus,
  ]);

  useEffect(() => {
    autoCheckStepCompleted();
    const currentAbortController = abortSignal.current;
    return () => {
      currentAbortController.abort();
    };
  }, [autoCheckStepCompleted]);
};
