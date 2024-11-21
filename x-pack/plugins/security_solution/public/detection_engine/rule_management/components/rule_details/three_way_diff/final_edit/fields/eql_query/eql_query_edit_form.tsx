/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Filter } from '@kbn/es-query';
import type { EqlOptions } from '@kbn/timelines-plugin/common';
import type { FormData, FormSchema } from '../../../../../../../../shared_imports';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import type { FieldValueQueryBar } from '../../../../../../../rule_creation_ui/components/query_bar';
import {
  type DiffableRule,
  RuleEqlQuery,
  QueryLanguageEnum,
} from '../../../../../../../../../common/api/detection_engine';
import { EqlQueryEditAdapter } from './eql_query_edit_adapter';

export function EqlQueryEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={EqlQueryEditAdapter}
      ruleFieldFormSchema={kqlQuerySchema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

const kqlQuerySchema = {} as FormSchema<{
  eqlQuery: RuleEqlQuery;
}>;

function deserializer(
  fieldValue: FormData,
  finalDiffableRule: DiffableRule
): {
  eqlQuery: FieldValueQueryBar;
  eqlOptions: EqlOptions;
} {
  const parsedEqlQuery =
    'eql_query' in finalDiffableRule
      ? RuleEqlQuery.parse(fieldValue.eql_query)
      : {
          query: '',
          language: QueryLanguageEnum.eql,
          filters: [],
        };

  return {
    eqlQuery: {
      query: {
        query: parsedEqlQuery.query,
        language: parsedEqlQuery.language,
      },
      // cast to Filter since RuleEqlQuery checks it's an array
      // potentially it might be incompatible type
      filters: parsedEqlQuery.filters as Filter[],
      saved_id: null,
    },
    eqlOptions: {
      eventCategoryField: parsedEqlQuery.event_category_override,
      timestampField: parsedEqlQuery.timestamp_field,
      tiebreakerField: parsedEqlQuery.tiebreaker_field,
    },
  };
}

function serializer(formData: FormData): {
  eql_query: RuleEqlQuery;
} {
  const formValue = formData as { eqlQuery: FieldValueQueryBar; eqlOptions: EqlOptions };

  return {
    eql_query: {
      query: formValue.eqlQuery.query.query as string,
      language: QueryLanguageEnum.eql,
      filters: formValue.eqlQuery.filters,
      event_category_override: formValue.eqlOptions.eventCategoryField,
      timestamp_field: formValue.eqlOptions.timestampField,
      tiebreaker_field: formValue.eqlOptions.tiebreakerField,
    },
  };
}
