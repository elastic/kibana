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
import type { FieldValueQueryBar } from '../query_bar';

interface UsePersistentQueryParams {
  form: FormHook<DefineStepRule>;
}

export function usePersistentQuery({ form }: UsePersistentQueryParams): void {
  const [{ ruleType, queryBar: currentQuery }] = useFormData({
    form,
    watch: ['ruleType', 'queryBar'],
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

    const queryField = form.getFields().queryBar;

    if (isEsqlRule(ruleType)) {
      queryField.reset({
        defaultValue: esqlQueryRef.current ?? DEFAULT_ESQL_QUERY,
      });

      return;
    }

    if (isEqlRule(ruleType)) {
      queryField.reset({
        defaultValue: eqlQueryRef.current ?? DEFAULT_EQL_QUERY,
      });

      return;
    }

    if (isThreatMatchRule(ruleType)) {
      queryField.reset({
        defaultValue: isEqual(queryRef.current, DEFAULT_KQL_QUERY)
          ? DEFAULT_THREAT_MATCH_KQL_QUERY
          : queryRef.current,
      });

      return;
    }

    queryField.reset({
      defaultValue: isEqual(queryRef.current, DEFAULT_THREAT_MATCH_KQL_QUERY)
        ? DEFAULT_KQL_QUERY
        : queryRef.current,
    });
  }, [ruleType, previousRuleType, form]);
}

const DEFAULT_KQL_QUERY = {
  query: { query: '', language: 'kuery' },
  filters: [],
  saved_id: null,
};

const DEFAULT_THREAT_MATCH_KQL_QUERY = {
  query: { query: '*:*', language: 'kuery' },
  filters: [],
  saved_id: null,
};

const DEFAULT_EQL_QUERY = {
  query: { query: '', language: 'eql' },
  filters: [],
  saved_id: null,
};

const DEFAULT_ESQL_QUERY = {
  query: { query: '', language: 'esql' },
  filters: [],
  saved_id: null,
};
