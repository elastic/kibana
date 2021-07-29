/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { produce } from 'immer';
import { find } from 'lodash';
import sqlSummary from 'sql-summary';
import { isEmpty, pickBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiCheckboxGroup,
  EuiCheckboxGroupOption,
  EuiComboBox,
  EuiSuggestItem,
  EuiSpacer,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';
import ECSSchema from './ecs_schema.json';
import osquerySchema from '../../editor/osquery_schema/v4.8.0.json';

import { FieldIcon } from '../../common/lib/kibana';
import {
  FIELD_TYPES,
  Form,
  FieldHook,
  getFieldValidityAndErrorMessage,
  useForm,
  Field,
  getUseField,
} from '../../shared_imports';

export const CommonUseField = getUseField({ component: Field });

// const TABLE_NAMES_REGEX = /(?<=from|join)\s+(\w+)/g;

const StyledFieldIcon = styled(FieldIcon)`
  width: 32px;
`;

const FormWrapper = styled.div`
  ${({ theme }) => `
      background-color: ${theme.eui.euiColorLightestShade};
      border-right:  ${theme.eui.euiBorderThin};
      border-bottom:  ${theme.eui.euiBorderThin};
      border-left:  ${theme.eui.euiBorderThin};
      padding:  ${theme.eui.euiSize};
  `}
`;

const ECSSchemaOptions = ECSSchema.map((ecs) => ({
  label: ecs.field,
  value: ecs,
}));

// const OsquerySchemaOptions = osquerySchema.map((osquery) =>

export const ECSComboboxField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const [selectedOptions, setSelected] = useState([]);
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);

  const handleChange = (selectedOptions) => {
    // onChange(
    //   produce((current) => {
    //     console.error('currenmt', current, selectedOptions);
    //     if (selectedOptions.length === 0) {
    //       // TODO: Fix in FORM
    //       return current;
    //     }
    //     if (!current) {
    //       return {
    //         [selectedOptions[0].value.field]: null,
    //       };
    //     }
    //     current[selectedOptions[0].value.field] = null;
    //     return current;
    //   })
    // );
    setSelected(selectedOptions);
  };

  const onCreateOption = (searchValue = []) => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return;
    }

    const newOption = {
      label: searchValue,
    };

    // Select the option.
    setSelected([newOption]);
  };

  const renderOption = useCallback((option, searchValue, contentClassName) => {
    // const { color, label, value } = option;
    // const dotColor = visColors[visColorsBehindText.indexOf(color)];
    return (
      <div className={contentClassName}>
        <FieldIcon type={option.value.type} />
        {option.value.field} {option.value.description}
      </div>
    );
  }, []);

  return (
    <EuiFormRow
      label={field.label}
      helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={describedByIds}
      {...rest}
    >
      <EuiComboBox
        prepend={<StyledFieldIcon type={selectedOptions[0]?.value?.type} />}
        fullWidth
        placeholder="Select a single option"
        singleSelection={{ asPlainText: true }}
        options={ECSSchemaOptions}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        onCreateOption={onCreateOption}
        customOptionText="Add {searchValue} as your occupation"
        renderOption={renderOption}
        rowHeight={32}
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

interface Props {
  field: FieldHook<string>;
  euiFieldProps?: Record<string, unknown>;
  idAria?: string;
  [key: string]: unknown;
}
export const ECSMappingEditorForm = ({ osquerySchemaOptions, defaultValue, onChange }: Props) => {
  const [selectedOptions, setSelected] = useState([]);
  const [selectedOsqueryOptions, setSelectedOsquery] = useState([]);

  const formSchema = {
    key: {
      type: FIELD_TYPES.COMBO_BOX,
      validations: [],
    },
    value: {
      type: FIELD_TYPES.COMBO_BOX,
    },
  };

  const { form } = useForm({
    schema: formSchema,
    onSubmit: (payload, isValid) => {
      console.error('smuit', payload);
      return payload;
    },
    defaultValue: {
      key: [],
      value: [],
    },
  });

  const handleChange = (selectedOptions) => {
    onChange(
      produce((current) => {
        console.error('currenmt', current, selectedOptions);
        if (selectedOptions.length === 0) {
          // TODO: Fix in FORM
          return current;
        }
        if (!current) {
          return {
            [selectedOptions[0].value.field]: null,
          };
        }
        current[selectedOptions[0].value.field] = null;
        return current;
      })
    );
    setSelected(selectedOptions);
  };

  const onCreateOption = (searchValue = []) => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return;
    }

    const newOption = {
      label: searchValue,
    };

    // Select the option.
    setSelected([newOption]);
  };

  const onCreateOsqueryOption = (searchValue = []) => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return;
    }

    const newOption = {
      label: searchValue,
    };

    // Select the option.
    setSelectedOsquery([newOption]);
  };

  const renderOption = (option, searchValue, contentClassName) => {
    // const { color, label, value } = option;
    // const dotColor = visColors[visColorsBehindText.indexOf(color)];
    return (
      <div className={contentClassName}>
        <FieldIcon type={option.value.type} />
        {option.value.field} {option.value.description}
      </div>
    );
  };

  const renderOsqueryOption = (option, searchValue, contentClassName) => {
    // const { color, label, value } = option;
    // const dotColor = visColors[visColorsBehindText.indexOf(color)];
    return (
      <div className={contentClassName}>
        {option.value.name} {option.value.description}
      </div>
    );
  };

  return (
    // <EuiFormRow
    //   label={field.label}
    //   helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
    //   error={errorMessage}
    //   isInvalid={isInvalid}
    //   fullWidth
    //   describedByIds={describedByIds}
    //   {...rest}
    // >
    <Form form={form}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <CommonUseField path="key" component={ECSComboboxField} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{'<='}</EuiFlexItem>
        <EuiFlexItem>
          <CommonUseField
            path="value"
            fullWidth
            placeholder="Select a single option"
            singleSelection={
              selectedOptions[0]?.value.normalization !== 'array' && { asPlainText: true }
            }
            options={osquerySchemaOptions}
            selectedOptions={selectedOsqueryOptions}
            onChange={setSelectedOsquery}
            onCreateOption={onCreateOsqueryOption}
            customOptionText="Add {searchValue} as your occupation"
            renderOption={renderOsqueryOption}
            rowHeight={32}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {defaultValue ? (
            <EuiButtonIcon iconType="trash" color="danger" />
          ) : (
            <EuiButtonIcon iconType="plus" color="primary" />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </Form>
  );
};

export const ECSMappingEditorField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const [osquerySchemaOptions, setOsquerySchemaOptions] = useState([]);
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const [selectedOptions, setSelected] = useState([]);
  const [selectedOsqueryOptions, setSelectedOsquery] = useState([]);

  // console.error('ECSSchema', ECSSchema);

  const onChange = (selectedOptions) => {
    field.setValue(
      produce((current) => {
        console.error('currenmt', current, selectedOptions);
        if (selectedOptions.length === 0) {
          // TODO: Fix in FORM
          return current;
        }
        if (!current) {
          return {
            [selectedOptions[0].value.field]: null,
          };
        }
        current[selectedOptions[0].value.field] = null;
        return current;
      })
    );
    setSelected(selectedOptions);
  };

  const onCreateOption = (searchValue = []) => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return;
    }

    const newOption = {
      label: searchValue,
    };

    // Select the option.
    setSelected([newOption]);
  };

  const onCreateOsqueryOption = (searchValue = []) => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return;
    }

    const newOption = {
      label: searchValue,
    };

    // Select the option.
    setSelectedOsquery([newOption]);
  };

  const renderOption = (option, searchValue, contentClassName) => {
    // const { color, label, value } = option;
    // const dotColor = visColors[visColorsBehindText.indexOf(color)];
    return (
      <div className={contentClassName}>
        <FieldIcon type={option.value.type} />
        {option.value.field} {option.value.description}
      </div>
    );
  };

  const renderOsqueryOption = (option, searchValue, contentClassName) => {
    // const { color, label, value } = option;
    // const dotColor = visColors[visColorsBehindText.indexOf(color)];
    return (
      <div className={contentClassName}>
        {option.value.name} {option.value.description}
      </div>
    );
  };

  useEffect(() => {
    setOsquerySchemaOptions((currentValue) => {
      const columnName = rest.query ? sqlSummary(rest.query).split('SELECT FROM ')[1] : null;
      const osqueryTable = find(osquerySchema, ['name', columnName]);

      if (osqueryTable) {
        return osqueryTable.columns.map((osqueryTableColumn) => ({
          label: osqueryTableColumn.name,
          value: osqueryTableColumn,
        }));
      }

      return currentValue;
    });
  }, [rest.query]);

  // console.error('sss', selectedOptions);

  // useEffect(() => {
  //   setCheckboxIdToSelectedMap(() =>
  //     (options as EuiCheckboxGroupOption[]).reduce((acc, option) => {
  //       acc[option.id] = isEmpty(field.value) ? true : field.value?.includes(option.id) ?? false;
  //       return acc;
  //     }, {} as Record<string, boolean>)
  //   );
  // }, [field.value, options]);

  console.error(';fee', field.value);

  return (
    // <EuiFormRow
    //   label={field.label}
    //   helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
    //   error={errorMessage}
    //   isInvalid={isInvalid}
    //   fullWidth
    //   describedByIds={describedByIds}
    //   {...rest}
    // >
    <ECSMappingEditorForm osquerySchemaOptions={osquerySchemaOptions} onChange={field.setValue} />
  );
};

// const AddField
