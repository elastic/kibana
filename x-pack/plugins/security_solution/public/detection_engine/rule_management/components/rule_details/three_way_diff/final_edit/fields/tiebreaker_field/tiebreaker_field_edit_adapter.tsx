/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { ComboBoxField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField } from '../../../../../../../../shared_imports';
import { useDiffableRuleEqlFieldsComboBoxOptions } from '../hooks/use_diffable_rule_eql_fields_combo_box_options';
import type { RuleFieldEditComponentProps } from '../rule_field_edit_component_props';
import * as i18n from './translations';

export function TiebreakerFieldEditAdapter({
  finalDiffableRule,
}: RuleFieldEditComponentProps): JSX.Element {
  const { nonDateFields } = useDiffableRuleEqlFieldsComboBoxOptions(finalDiffableRule);
  const comboBoxFieldProps = useMemo(
    () => ({
      label: i18n.EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_LABEL,
      helpText: i18n.EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_HELPER,
      euiFieldProps: {
        fullWidth: true,
        singleSelection: { asPlainText: true },
        noSuggestions: false,
        placeholder: '',
        onCreateOption: undefined,
        options: nonDateFields,
      },
    }),
    [nonDateFields]
  );

  return (
    <UseField
      path="tiebreakerField"
      component={ComboBoxField}
      componentProps={comboBoxFieldProps}
    />
  );
}
