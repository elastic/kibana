/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { isThreatMatchRule } from '../../../../../common/detection_engine/utils';
import type { FormHook } from '../../../../shared_imports';
import { useFormData } from '../../../../shared_imports';
import { type DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';

interface UsePersistentThreatMatchStateParams {
  form: FormHook<DefineStepRule>;
  ruleTypePath: string;
  indexPatternPath: string;
  queryPath: string;
  mappingPath: string;
}

interface LastThreatMatchState {
  indexPattern: unknown;
  query: unknown;
  mapping: unknown;
}

export function usePersistentThreatMatchState({
  form,
  ruleTypePath,
  indexPatternPath,
  queryPath,
  mappingPath,
}: UsePersistentThreatMatchStateParams): void {
  const lastThreatMatchState = useRef<LastThreatMatchState | undefined>();
  const [
    {
      [ruleTypePath]: ruleType,
      [indexPatternPath]: indexPattern,
      [queryPath]: query,
      [mappingPath]: mapping,
    },
  ] = useFormData({ form, watch: [ruleTypePath, indexPatternPath, queryPath, mappingPath] });
  const previousRuleType = usePrevious(ruleType);

  useEffect(() => {
    if (
      isThreatMatchRule(ruleType) &&
      !isThreatMatchRule(previousRuleType) &&
      lastThreatMatchState.current
    ) {
      form.updateFieldValues({
        [indexPatternPath]: lastThreatMatchState.current.indexPattern,
        [queryPath]: lastThreatMatchState.current.query,
        [mappingPath]: lastThreatMatchState.current.mapping,
      });

      return;
    }

    if (isThreatMatchRule(ruleType)) {
      lastThreatMatchState.current = { indexPattern, query, mapping };
    }
  }, [
    form,
    ruleType,
    previousRuleType,
    indexPatternPath,
    queryPath,
    mappingPath,
    indexPattern,
    query,
    mapping,
  ]);
}
