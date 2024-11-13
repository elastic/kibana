/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { isEqual } from 'lodash';
import usePrevious from 'react-use/lib/usePrevious';
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
  const queryRef = useRef<FieldValueQueryBar | undefined>();
  const eqlQueryRef = useRef<FieldValueQueryBar | undefined>();
  const esqlQueryRef = useRef<FieldValueQueryBar | undefined>();

  useEffect(() => {
    if (isEqlRule(ruleType)) {
      eqlQueryRef.current = currentQuery;
    } else if (isEsqlRule(ruleType)) {
      esqlQueryRef.current = currentQuery;
    } else {
      queryRef.current = currentQuery;
    }
  }, [ruleType, currentQuery]);

  useEffect(() => {
    if (ruleType === previousRuleType) {
      return;
    }

    const queryField = form.getFields()[queryPath];

    if (isEsqlRule(ruleType)) {
      queryField.reset({
        defaultValue: esqlQueryRef.current ?? DEFAULT_ESQL_QUERY_FIELD_VALUE,
      });

      return;
    }

    if (isEqlRule(ruleType)) {
      queryField.reset({
        defaultValue: eqlQueryRef.current ?? DEFAULT_EQL_QUERY_FIELD_VALUE,
      });

      return;
    }

    if (isThreatMatchRule(ruleType)) {
      queryField.reset({
        defaultValue: isEqual(queryRef.current, DEFAULT_KQL_QUERY_FIELD_VALUE)
          ? DEFAULT_THREAT_MATCH_KQL_QUERY_FIELD_VALUE
          : queryRef.current,
      });

      return;
    }

    queryField.reset({
      defaultValue: isEqual(queryRef.current, DEFAULT_THREAT_MATCH_KQL_QUERY_FIELD_VALUE)
        ? DEFAULT_KQL_QUERY_FIELD_VALUE
        : queryRef.current,
    });
  }, [queryPath, ruleType, previousRuleType, form]);
}
