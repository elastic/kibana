/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
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
const ESQL_QUERY_LANGUAGE = 'esql';

interface UsePersistentQueryParams {
  form: FormHook<DefineStepRule>;
  ruleTypePath: string;
  queryPath: string;
}

interface UsePersistentQueryResult {
  setPersistentQuery: (value: FieldValueQueryBar) => void;
  setPersistentEqlQuery: (value: FieldValueQueryBar) => void;
  setPersistentEsqlQuery: (value: FieldValueQueryBar) => void;
}

/**
 * Persists query when switching between different rule types using different queries (kuery and ES|QL).
 *
 * When the user changes rule type to or from "threat_match" this will modify the
 * default "Custom query" string to either:
 *   * from '' to '*:*' if the type is switched to "threat_match"
 *   * from '*:*' back to '' if the type is switched back from "threat_match" to another one
 */
export function usePersistentQuery({
  form,
  ruleTypePath,
  queryPath,
}: UsePersistentQueryParams): UsePersistentQueryResult {
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

    if (isEqlRule(ruleType)) {
      eqlQueryRef.current =
        currentQuery?.query?.language === EQL_QUERY_LANGUAGE ? currentQuery : eqlQueryRef.current;

      return;
    }

    if (isEsqlRule(ruleType)) {
      esqlQueryRef.current =
        currentQuery?.query?.language === ESQL_QUERY_LANGUAGE ? currentQuery : esqlQueryRef.current;

      return;
    }

    if ([EQL_QUERY_LANGUAGE, ESQL_QUERY_LANGUAGE].includes(currentQuery?.query?.language)) {
      return;
    }

    queryRef.current = currentQuery;
  }, [ruleType, currentQuery]);

  useEffect(() => {
    if (ruleType === previousRuleType || !ruleType) {
      return;
    }

    const queryField = form.getFields()[queryPath] as FieldHook<FieldValueQueryBar>;

    if (isEqlRule(ruleType)) {
      queryField.reset({
        defaultValue: eqlQueryRef.current,
      });
      return;
    }

    if (isEsqlRule(ruleType)) {
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
        defaultValue: queryRef.current,
      });
    }
  }, [queryPath, ruleType, previousRuleType, form]);

  return useMemo(
    () => ({
      setPersistentQuery: (value: FieldValueQueryBar) => (queryRef.current = value),
      setPersistentEqlQuery: (value: FieldValueQueryBar) => (eqlQueryRef.current = value),
      setPersistentEsqlQuery: (value: FieldValueQueryBar) => (esqlQueryRef.current = value),
    }),
    [queryRef]
  );
}
