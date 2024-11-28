/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { FormData, FormSchema } from '../../../../../../../../shared_imports';
import { schema } from '../../../../../../../rule_creation_ui/components/step_define_rule/schema';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import type { FieldValueQueryBar } from '../../../../../../../rule_creation_ui/components/query_bar_field';
import {
  KqlQueryLanguage,
  KqlQueryType,
  RuleQuery,
  SavedQueryId,
  RuleKqlQuery,
} from '../../../../../../../../../common/api/detection_engine';
import type {
  DiffableRule,
  DiffableRuleTypes,
  InlineKqlQuery,
  SavedKqlQuery,
} from '../../../../../../../../../common/api/detection_engine';
import { isFilters } from '../../../../helpers';
import { KqlQueryEdit } from './kql_query_edit';

export function KqlQueryEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={KqlQueryEdit}
      ruleFieldFormSchema={kqlQuerySchema}
      deserializer={kqlQueryDeserializer}
      serializer={kqlQuerySerializer}
    />
  );
}

const kqlQuerySchema = {
  ruleType: schema.ruleType,
  queryBar: schema.queryBar,
} as FormSchema<{
  ruleType: DiffableRuleTypes;
  queryBar: FieldValueQueryBar;
}>;

function kqlQueryDeserializer(
  fieldValue: FormData,
  finalDiffableRule: DiffableRule
): {
  ruleType: Type;
  queryBar: FieldValueQueryBar;
} {
  const parsedFieldValue = RuleKqlQuery.parse(fieldValue.kql_query);

  if (parsedFieldValue.type === KqlQueryType.inline_query) {
    const returnValue = {
      ruleType: finalDiffableRule.type,
      queryBar: {
        query: {
          query: parsedFieldValue.query,
          language: parsedFieldValue.language,
        },
        filters: isFilters(parsedFieldValue.filters) ? parsedFieldValue.filters : [],
        saved_id: null,
      },
    };

    return returnValue;
  }

  const returnValue = {
    ruleType: finalDiffableRule.type,
    queryBar: {
      query: {
        query: '',
        language: '',
      },
      filters: [],
      saved_id: parsedFieldValue.saved_query_id,
    },
  };

  return returnValue;
}

function kqlQuerySerializer(formData: FormData): {
  kql_query: RuleKqlQuery;
} {
  const formValue = formData as { ruleType: Type; queryBar: FieldValueQueryBar };

  if (formValue.ruleType === 'saved_query') {
    const savedQueryId = SavedQueryId.parse(formValue.queryBar.saved_id);

    const savedKqlQuery: SavedKqlQuery = {
      type: KqlQueryType.saved_query,
      saved_query_id: savedQueryId,
    };

    return {
      kql_query: savedKqlQuery,
    };
  }

  const query = RuleQuery.parse(formValue.queryBar.query.query);
  const language = KqlQueryLanguage.parse(formValue.queryBar.query.language);

  const inlineKqlQuery: InlineKqlQuery = {
    type: KqlQueryType.inline_query,
    query,
    language,
    filters: formValue.queryBar.filters,
  };

  return { kql_query: inlineKqlQuery };
}
