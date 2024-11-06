/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import { EqlQueryBar } from '../../../../../../../rule_creation_ui/components/eql_query_bar';
import { UseField } from '../../../../../../../../shared_imports';
import type { RuleFieldEditComponentProps } from '../rule_field_edit_component_props';
import { useDiffableRuleDataView } from '../hooks/use_diffable_rule_data_view';
import { queryValidatorFactory } from '../../../../../../../rule_creation_ui/validators/query_validator_factory';
import { debounceAsync } from '../../../../../../../rule_creation_ui/validators/debounce_async';
import { eqlQueryValidatorFactory } from '../../../../../../../rule_creation_ui/validators/eql_query_validator_factory';
import * as i18n from './translations';

export function EqlQueryEditAdapter({
  finalDiffableRule,
}: RuleFieldEditComponentProps): JSX.Element {
  const { dataView, isLoading } = useDiffableRuleDataView(finalDiffableRule);
  const optionsData = useMemo(
    () =>
      !dataView
        ? {
            keywordFields: [],
            dateFields: [],
            nonDateFields: [],
          }
        : {
            keywordFields: dataView.fields
              .filter((f) => f.esTypes?.includes('keyword'))
              .map((f) => ({ label: f.name })),
            dateFields: dataView.fields
              .filter((f) => f.type === 'date')
              .map((f) => ({ label: f.name })),
            nonDateFields: dataView.fields
              .filter((f) => f.type !== 'date')
              .map((f) => ({ label: f.name })),
          },
    [dataView]
  );

  const componentProps = useMemo(
    () => ({
      optionsData,
      optionsSelected: {},
      isSizeOptionDisabled: true,
      isDisabled: isLoading,
      isLoading,
      indexPattern: dataView ?? DEFAULT_DATA_VIEW_BASE,
      showFilterBar: true,
      idAria: 'ruleEqlQueryBar',
      dataTestSubj: 'ruleEqlQueryBar',
    }),
    [optionsData, dataView, isLoading]
  );
  const fieldConfig = useMemo(() => {
    if (finalDiffableRule.type !== 'eql') {
      return {
        label: i18n.EQL_QUERY_BAR_LABEL,
      };
    }

    const eqlOptions = {
      eventCategoryField: finalDiffableRule.event_category_override,
      tiebreakerField: finalDiffableRule.tiebreaker_field,
      timestampField: finalDiffableRule.timestamp_field,
    };

    return {
      label: i18n.EQL_QUERY_BAR_LABEL,
      validations: [
        {
          validator: queryValidatorFactory('eql'),
        },
        {
          validator: (...args) => {
            return debounceAsync(
              eqlQueryValidatorFactory({ dataViewId: dataView?.id ?? '', eqlOptions }),
              300
            )(...args);
          },
        },
      ],
    };
  }, [dataView, finalDiffableRule]);

  return (
    <UseField
      key="eqlQuery"
      path="eqlQuery"
      component={EqlQueryBar}
      componentProps={componentProps}
      config={fieldConfig}
    />
  );
}

const DEFAULT_DATA_VIEW_BASE: DataViewBase = {
  title: '',
  fields: [],
};
