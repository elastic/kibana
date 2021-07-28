/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable */

import { find } from 'lodash';
import sqlSummary from 'sql-summary';
import { isEmpty, pickBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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

import { FieldHook, getFieldValidityAndErrorMessage } from '../../shared_imports';

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

interface Props {
  field: FieldHook<string>;
  euiFieldProps?: Record<string, unknown>;
  idAria?: string;
  [key: string]: unknown;
}
export const ECSMappingEditorForm = ({ osquerySchemaOptions }) => {
  const [selectedOptions, setSelected] = useState([]);
  const [selectedOsqueryOptions, setSelectedOsquery] = useState([]);

  console.error('ECSSchema', ECSSchema);

  const onChange = (selectedOptions) => {
    // We should only get back either 0 or 1 options.
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

  // const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);

  const renderOption = (option, searchValue, contentClassName) => {
    // const { color, label, value } = option;
    // const dotColor = visColors[visColorsBehindText.indexOf(color)];
    return (
      <EuiSuggestItem
        type={{ iconType: 'kqlField', color: 'tint5' }}
        labelDisplay="expand"
        label={option.value.field}
        description={option.value.description}
      />
    );
  };

  const renderOsqueryOption = (option, searchValue, contentClassName) => {
    // const { color, label, value } = option;
    // const dotColor = visColors[visColorsBehindText.indexOf(color)];
    return (
      <EuiSuggestItem
        type={{ iconType: 'kqlValue', color: 'tint0' }}
        labelDisplay="expand"
        label={option.value.name}
        description={option.value.description}
      />
    );
  };

  // useEffect(() => {
  //   setCheckboxIdToSelectedMap(() =>
  //     (options as EuiCheckboxGroupOption[]).reduce((acc, option) => {
  //       acc[option.id] = isEmpty(field.value) ? true : field.value?.includes(option.id) ?? false;
  //       return acc;
  //     }, {} as Record<string, boolean>)
  //   );
  // }, [field.value, options]);

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
    <FormWrapper>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiComboBox
                fullWidth
                placeholder="Select a single option"
                singleSelection={{ asPlainText: true }}
                options={ECSSchemaOptions}
                selectedOptions={selectedOptions}
                onChange={onChange}
                onCreateOption={onCreateOption}
                customOptionText="Add {searchValue} as your occupation"
                renderOption={renderOption}
                rowHeight={40}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{'<='}</EuiFlexItem>
            <EuiFlexItem>
              <EuiComboBox
                fullWidth
                placeholder="Select a single option"
                singleSelection={{ asPlainText: true }}
                options={osquerySchemaOptions}
                selectedOptions={selectedOsqueryOptions}
                onChange={setSelectedOsquery}
                onCreateOption={onCreateOsqueryOption}
                customOptionText="Add {searchValue} as your occupation"
                renderOption={renderOsqueryOption}
                rowHeight={40}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton>{'Add field'}</EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FormWrapper>
  );
};

export const ECSMappingEditorField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const [osquerySchemaOptions, setOsquerySchemaOptions] = useState([]);
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const [selectedOptions, setSelected] = useState([]);
  const [selectedOsqueryOptions, setSelectedOsquery] = useState([]);

  console.error('ECSSchema', ECSSchema);

  const onChange = (selectedOptions) => {
    // We should only get back either 0 or 1 options.
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

  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);

  const renderOption = (option, searchValue, contentClassName) => {
    // const { color, label, value } = option;
    // const dotColor = visColors[visColorsBehindText.indexOf(color)];
    return (
      <EuiSuggestItem
        type={{ iconType: 'kqlField', color: 'tint5' }}
        labelDisplay="expand"
        label={option.value.field}
        description={option.value.description}
      />
    );
  };

  const renderOsqueryOption = (option, searchValue, contentClassName) => {
    // const { color, label, value } = option;
    // const dotColor = visColors[visColorsBehindText.indexOf(color)];
    return (
      <EuiSuggestItem
        type={{ iconType: 'kqlValue', color: 'tint0' }}
        labelDisplay="expand"
        label={option.value.name}
        description={option.value.description}
      />
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

  // useEffect(() => {
  //   setCheckboxIdToSelectedMap(() =>
  //     (options as EuiCheckboxGroupOption[]).reduce((acc, option) => {
  //       acc[option.id] = isEmpty(field.value) ? true : field.value?.includes(option.id) ?? false;
  //       return acc;
  //     }, {} as Record<string, boolean>)
  //   );
  // }, [field.value, options]);

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
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiComboBox
            fullWidth
            placeholder="Select a single option"
            singleSelection={{ asPlainText: true }}
            options={ECSSchemaOptions}
            selectedOptions={selectedOptions}
            onChange={onChange}
            onCreateOption={onCreateOption}
            customOptionText="Add {searchValue} as your occupation"
            renderOption={renderOption}
            rowHeight={40}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{'<='}</EuiFlexItem>
        <EuiFlexItem>
          <EuiComboBox
            fullWidth
            placeholder="Select a single option"
            singleSelection={{ asPlainText: true }}
            options={osquerySchemaOptions}
            selectedOptions={selectedOsqueryOptions}
            onChange={setSelectedOsquery}
            onCreateOption={onCreateOsqueryOption}
            customOptionText="Add {searchValue} as your occupation"
            renderOption={renderOsqueryOption}
            rowHeight={40}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <ECSMappingEditorForm osquerySchemaOptions={osquerySchemaOptions} />
    </>
  );
};

// const AddField
