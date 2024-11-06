/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataViewBase } from '@kbn/es-query';
import { EqlQueryEdit } from '../../../../../../../rule_creation_ui/components/eql_query_edit';
import type { RuleFieldEditComponentProps } from '../rule_field_edit_component_props';
import { useDiffableRuleDataView } from '../hooks/use_diffable_rule_data_view';

export function EqlQueryEditAdapter({
  finalDiffableRule,
}: RuleFieldEditComponentProps): JSX.Element {
  const { dataView, isLoading } = useDiffableRuleDataView(finalDiffableRule);

  return (
    <EqlQueryEdit
      path="eqlQuery"
      required
      eqlOptions={EQL_OPTIONS}
      dataView={dataView ?? DEFAULT_DATA_VIEW_BASE}
      loading={isLoading}
      disabled={isLoading}
    />
  );
}

const EQL_OPTIONS = {};

const DEFAULT_DATA_VIEW_BASE: DataViewBase = {
  title: '',
  fields: [],
};
