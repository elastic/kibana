/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DataViewBase } from '@kbn/es-query';
import { debounceAsync } from '@kbn/securitysolution-utils';
import type { FieldConfig } from '../../../../shared_imports';
import { UseField } from '../../../../shared_imports';
import type { FieldValueQueryBar } from '../../../rule_creation_ui/components/query_field';
import { QueryField } from '../../../rule_creation_ui/components/query_field';
import { queryRequiredValidatorFactory } from '../../../rule_creation_ui/validators/query_required_validator_factory';
import { esqlQueryValidatorFactory } from './validators/esql_query_validator_factory';
import { EsqlInfoIcon } from './esql_info_icon';
import * as i18n from './translations';

interface EsqlQueryEditProps {
  path: string;
  fieldsToValidateOnChange?: string | string[];
  dataView: DataViewBase;
  required?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onValidityChange?: (arg: boolean) => void;
}

export const EsqlQueryEdit = memo(function EsqlQueryEdit({
  path,
  fieldsToValidateOnChange,
  dataView,
  required = false,
  loading = false,
  disabled = false,
  onValidityChange,
}: EsqlQueryEditProps): JSX.Element {
  const queryClient = useQueryClient();
  const componentProps = useMemo(
    () => ({
      isDisabled: disabled,
      isLoading: loading,
      indexPattern: dataView,
      idAria: 'ruleEsqlQueryBar',
      dataTestSubj: 'ruleEsqlQueryBar',
      onValidityChange,
    }),
    [dataView, loading, disabled, onValidityChange]
  );
  const fieldConfig: FieldConfig<FieldValueQueryBar> = useMemo(
    () => ({
      label: i18n.ESQL_QUERY,
      labelAppend: <EsqlInfoIcon />,
      fieldsToValidateOnChange: fieldsToValidateOnChange
        ? [path, fieldsToValidateOnChange].flat()
        : undefined,
      validations: [
        ...(required
          ? [
              {
                validator: queryRequiredValidatorFactory('esql'),
              },
            ]
          : []),
        {
          validator: debounceAsync(esqlQueryValidatorFactory({ queryClient }), 300),
        },
      ],
    }),
    [required, path, fieldsToValidateOnChange, queryClient]
  );

  return (
    <UseField
      path={path}
      component={QueryField}
      componentProps={componentProps}
      config={fieldConfig}
    />
  );
});
