/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import React, { useMemo, useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';

import type { FieldHook } from '../../../../shared_imports';
import { Field } from '../../../../shared_imports';
import { fetchFieldsFromESQL } from './fetch_esql_fields';
interface EsqlFieldsSelectProps {
  query: string;
  field: FieldHook;
}

const FIELD_COMBO_BOX_WIDTH = 410;

const fieldDescribedByIds = 'detectionEngineStepDefineRuleEsqlFieldsSelect';

export const EsqlFieldsSelectComponent: React.FC<EsqlFieldsSelectProps> = ({
  query,
  field,
}: EsqlFieldsSelectProps) => {
  const [options, setOptions] = useState<Array<{ label: string }>>([]);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const kibana = useKibana<{ expressions: ExpressionsStart }>();
  const { expressions } = kibana.services;

  const fieldEuiFieldProps = useMemo(
    () => ({
      fullWidth: true,
      noSuggestions: false,
      options,
      placeholder: 'all available fields from ESQL Query',
      onCreateOption: undefined,
      style: { width: `${FIELD_COMBO_BOX_WIDTH}px` },
    }),
    [options]
  );

  // TODO: add debounce
  useEffect(() => {
    const retrieveFields = async () => {
      const res = await fetchFieldsFromESQL({ esql: query }, expressions);
      setOptions(res?.columns.map((x) => ({ label: x.id })) || []);
    };

    retrieveFields();
  }, [expressions, query]);

  console.log('field', field);
  useEffect(() => {
    const optionsSet = new Set(options.map((option) => option.label));
    const value = field.value as string[];
    console.log('value', value, Array.from(optionsSet.values()));
    if (value.length === 0) {
      if (!field.isValid) {
        field.setErrors([]);
      }
      return;
    }

    const newInvalidFields: string[] = [];

    value.forEach((fieldKey) => {
      if (!optionsSet.has(fieldKey)) {
        newInvalidFields.push(fieldKey);
      }
    });
    console.log('newInvalidFields', newInvalidFields, invalidFields);

    //  console.log('<<<< ', JSON.stringify([newInvalidFields, options, value], null, 2));
    if (newInvalidFields.length && !deepEqual(newInvalidFields, invalidFields)) {
      setInvalidFields(newInvalidFields);
      field.setErrors([
        {
          message: `These fields are no longer returned by ESQL query: ${newInvalidFields.join(
            ', '
          )}`,
        },
      ]);
    }

    if (newInvalidFields.length === 0 && !deepEqual(newInvalidFields, invalidFields)) {
      setInvalidFields([]);
      field.setErrors([]);
    }
  }, [field, invalidFields, options, setInvalidFields, field.value]);

  // useEffect(() => {
  //   // const message = `Fields are no longer returned by ESQL query: ${invalidFields.join(', ')}`;

  //   if (invalidFields.length) {
  //     fieldRef.current.setErrors([
  //       {
  //         message: `These fields are no longer returned by ESQL query: ${invalidFields.join(', ')}`,
  //       },
  //     ]);
  //   }
  // }, [invalidFields, fieldRef]);
  // TODO fix validation
  return (
    <Field
      field={field}
      idAria={fieldDescribedByIds}
      euiFieldProps={fieldEuiFieldProps}
      isInvalid={invalidFields.length > 0}
      validationData={'test'}
    />
  );
};

export const EsqlFieldsSelect = React.memo(EsqlFieldsSelectComponent);
