/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { isEqual } from 'lodash';
import usePrevious from 'react-use/lib/usePrevious';
import type { FieldHook } from '../../../../shared_imports';
import { useFormData, type FormHook } from '../../../../shared_imports';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import {
  isEqlRule,
  isEsqlRule,
  isThreatMatchRule,
} from '../../../../../common/detection_engine/utils';
import {
  DEFAULT_EQL_QUERY_FIELD_VALUE,
  DEFAULT_ESQL_QUERY_FIELD_VALUE,
  DEFAULT_KQL_QUERY_FIELD_VALUE,
  DEFAULT_THREAT_MATCH_KQL_QUERY_FIELD_VALUE,
  type FieldValueQueryBar,
} from '../query_bar';

const EQL_QUERY_LANGUAGE = 'eql';
const ESQL_QUERY_LANGIAGE = 'esql';

interface UsePersistentQueryParams {
  form: FormHook<DefineStepRule>;
  ruleTypePath: string;
  queryPath: string;
}

/**
 * Persists query when switching between different rule types using different queries (kuery, EQL, ES|QL).
 */
export function usePersistentQuery({
  form,
  ruleTypePath,
  queryPath,
}: UsePersistentQueryParams): void {
  const [{ [ruleTypePath]: ruleType, [queryPath]: currentQuery }] = useFormData({
    form,
    watch: [ruleTypePath, queryPath],
  });
  const previousRuleType = usePrevious(ruleType);
  const queryRef = useRef<FieldValueQueryBar>(DEFAULT_KQL_QUERY_FIELD_VALUE);
  const eqlQueryRef = useRef<FieldValueQueryBar>(DEFAULT_EQL_QUERY_FIELD_VALUE);
  const esqlQueryRef = useRef<FieldValueQueryBar>(DEFAULT_ESQL_QUERY_FIELD_VALUE);

  useEffect(() => {
    if (!ruleType) {
      return;
    }

    if (currentQuery?.query?.language === EQL_QUERY_LANGUAGE) {
      eqlQueryRef.current = currentQuery;
    } else if (currentQuery?.query?.language === ESQL_QUERY_LANGIAGE) {
      esqlQueryRef.current = currentQuery;
    } else {
      queryRef.current = currentQuery;
    }
  }, [ruleType, currentQuery]);

  useEffect(() => {
    if (ruleType === previousRuleType || !ruleType) {
      return;
    }

    const queryField = form.getFields()[queryPath] as FieldHook<FieldValueQueryBar>;

    if (isEqlRule(ruleType) && queryField.value?.query?.language !== EQL_QUERY_LANGUAGE) {
      queryField.reset({
        defaultValue: eqlQueryRef.current,
      });

      return;
    }

    if (isEsqlRule(ruleType) && queryField.value?.query?.language !== ESQL_QUERY_LANGIAGE) {
      queryField.reset({
        defaultValue: esqlQueryRef.current,
      });

      return;
    }

    if (isThreatMatchRule(ruleType) && isEqual(queryRef.current, DEFAULT_KQL_QUERY_FIELD_VALUE)) {
      queryField.reset({
        defaultValue: DEFAULT_THREAT_MATCH_KQL_QUERY_FIELD_VALUE,
      });

      return;
    }

    if (
      isThreatMatchRule(previousRuleType) &&
      isEqual(queryRef.current, DEFAULT_THREAT_MATCH_KQL_QUERY_FIELD_VALUE)
    ) {
      queryField.reset({
        defaultValue: DEFAULT_KQL_QUERY_FIELD_VALUE,
      });
    }

    if (isEqlRule(previousRuleType) || isEsqlRule(previousRuleType)) {
      queryField.reset({
        defaultValue: queryRef.current ?? DEFAULT_KQL_QUERY_FIELD_VALUE,
      });
    }
  }, [queryPath, ruleType, previousRuleType, form]);
}
