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
import type { FieldValueQueryBar } from '../../../rule_creation_ui/components/query_bar_field';
import { QueryBarField } from '../../../rule_creation_ui/components/query_bar_field';
import { esqlQueryValidatorFactory } from './validators/esql_query_validator_factory';
import { EsqlInfoIcon } from './esql_info_icon';
import * as i18n from './translations';
import { esqlQueryRequiredValidatorFactory } from './validators/esql_query_required_validator_factory';

interface EsqlQueryEditProps {
  path: string;
  fieldsToValidateOnChange?: string | string[];
  dataView: DataViewBase;
  required?: boolean;
  loading?: boolean;
  disabled?: boolean;
  skipIdColumnCheck?: boolean;
  onValidityChange?: (arg: boolean) => void;
}

export const EsqlQueryEdit = memo(function EsqlQueryEdit({
  path,
  fieldsToValidateOnChange,
  dataView,
  required = false,
  loading = false,
  disabled = false,
  skipIdColumnCheck,
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
                validator: esqlQueryRequiredValidatorFactory(),
              },
            ]
          : []),
        {
          validator: debounceAsync(
            esqlQueryValidatorFactory({ queryClient, skipIdColumnCheck }),
            300
          ),
        },
      ],
    }),
    [required, path, fieldsToValidateOnChange, queryClient, skipIdColumnCheck]
  );

  return (
    <UseField
      path={path}
      component={QueryBarField}
      componentProps={componentProps}
      config={fieldConfig}
    />
  );
});
