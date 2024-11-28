/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { FieldConfig } from '../../../../shared_imports';
import { UseField } from '../../../../shared_imports';
import type { FieldValueQueryBar } from '../../../rule_creation_ui/components/query_bar_field';
import { QueryBarField } from '../../../rule_creation_ui/components/query_bar_field';
import { threatMatchQueryRequiredValidator } from './validators/threat_match_query_required_validator';
import { kueryValidatorFactory } from '../../../rule_creation_ui/validators/kuery_validator_factory';
import * as i18n from './translations';

interface ThreatMatchQueryEditProps {
  path: string;
  threatIndexPatterns: DataViewBase;
  loading?: boolean;
}

export const ThreatMatchQueryEdit = memo(function ThreatMatchQueryEdit({
  path,
  threatIndexPatterns,
  loading,
}: ThreatMatchQueryEditProps): JSX.Element {
  return (
    <UseField
      path={path}
      config={THREAT_MATCH_QUERY_FIELD_CONFIG}
      component={QueryBarField}
      componentProps={{
        indexPattern: threatIndexPatterns,
        isLoading: loading,
        isDisabled: false,
        openTimelineSearch: false,
        idAria: 'ruleThreatMatchQueryField',
        dataTestSubj: 'ruleThreatMatchQueryField',
      }}
    />
  );
});

const THREAT_MATCH_QUERY_FIELD_CONFIG: FieldConfig<FieldValueQueryBar> = {
  label: i18n.THREAT_MATCH_QUERY_FIELD_LABEL,
  validations: [
    {
      validator: threatMatchQueryRequiredValidator,
    },
    {
      validator: kueryValidatorFactory(),
    },
  ],
};
