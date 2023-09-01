/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { EuiSpacer, EuiFormRow } from '@elastic/eui';
import type { CustomFieldBuilder } from '../types';
import { createCommonCustomFieldBuilder } from '../common';
import { ListOptions } from './list_options';
import type { ListOption } from './list_options';

interface ListOptionsSelectorProps {
  dataTestSubj: string;
  disabled: boolean;
  field: FieldHook<string>;
  idAria: string;
  isLoading: boolean;
}

const ListOptionsSelector = ({
  dataTestSubj,
  disabled = false,
  field,
  idAria,
  isLoading = false,
}: ListOptionsSelectorProps) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const [currentListValues, setCurrentListValues] = useState<ListOption[]>([]);

  const onChange = useCallback(
    (listValues: ListOption[]) => {
      field.setValue(listValues);
      setCurrentListValues(listValues);
    },
    [field, setCurrentListValues]
  );

  return (
    <>
      <EuiSpacer />
      <EuiFormRow
        data-test-subj={dataTestSubj}
        describedByIds={idAria ? [idAria] : undefined}
        error={errorMessage}
        fullWidth
        helpText={field.helpText}
        isInvalid={isInvalid}
        label={field.label}
        labelAppend={field.labelAppend}
      >
        <ListOptions
          disabled={disabled}
          isLoading={isLoading}
          onChange={onChange}
          listValues={currentListValues}
        />
      </EuiFormRow>
    </>
  );
};

ListOptionsSelector.displayName = 'ListOptionsSelector';

export const createListCustomFieldBuilder: CustomFieldBuilder = ({ customFieldType }) => ({
  build: () => {
    const commonBuilder = createCommonCustomFieldBuilder({
      customFieldType,
      component: ListOptionsSelector,
      componentProps: {
        dataTestSubj: 'ListOptions',
        idAria: 'ListOptions',
      },
    });

    return commonBuilder.build();
  },
});
