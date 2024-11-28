/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormData, FormSchema } from '../../../../../../../../shared_imports';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import type { FieldValueQueryBar } from '../../../../../../../rule_creation_ui/components/query_bar_field';
import {
  type DiffableRule,
  QueryLanguageEnum,
  RuleEsqlQuery,
} from '../../../../../../../../../common/api/detection_engine';
import { EsqlQueryEditAdapter } from './esql_query_edit_adapter';

export function EsqlQueryEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={EsqlQueryEditAdapter}
      ruleFieldFormSchema={formSchema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

const formSchema = {} as FormSchema<{
  esqlQuery: RuleEsqlQuery;
}>;

function deserializer(
  fieldValue: FormData,
  finalDiffableRule: DiffableRule
): {
  esqlQuery: FieldValueQueryBar;
} {
  const parsedEsqlQuery =
    'esql_query' in finalDiffableRule
      ? RuleEsqlQuery.parse(fieldValue.esql_query)
      : {
          query: '',
          language: QueryLanguageEnum.esql,
          filters: [],
        };

  return {
    esqlQuery: {
      query: {
        query: parsedEsqlQuery.query,
        language: parsedEsqlQuery.language,
      },
      filters: [],
      saved_id: null,
    },
  };
}

function serializer(formData: FormData): {
  esql_query: RuleEsqlQuery;
} {
  const formValue = formData as { esqlQuery: FieldValueQueryBar };

  return {
    esql_query: {
      query: formValue.esqlQuery.query.query as string,
      language: QueryLanguageEnum.esql,
    },
  };
}
