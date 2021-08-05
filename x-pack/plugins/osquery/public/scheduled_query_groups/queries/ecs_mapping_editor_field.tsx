/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, map, trim } from 'lodash';
import sqlSummary from 'sql-summary';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
  EuiSpacer,
  EuiTitle,
  EuiText,
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

const TABLE_NAMES_REGEX = /(?<=from|join)\s+(\w+)/g;

const StyledFieldIcon = styled(FieldIcon)`
  width: 32px;
`;

const StyledFieldSpan = styled.span`
  padding-top: 0 !important;
  padding-bottom: 0 !important;
`;

const ECSSchemaOptions = ECSSchema.map((ecs) => ({
  label: ecs.field,
  value: ecs,
}));

export const ECSComboboxField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const { setValue, value } = field;
  const [selectedOptions, setSelected] = useState([]);
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);

  const handleChange = useCallback(
    (selectedOptions) => {
      setSelected(selectedOptions);
      setValue(selectedOptions[0]?.label ?? '');
    },
    [setSelected, setValue]
  );

  // TODO: Create own component for this.
  const renderOption = useCallback(
    (option, searchValue, contentClassName) => (
      <EuiFlexGroup
        className={`${contentClassName} euiSuggestItem`}
        alignItems="center"
        gutterSize="xs"
      >
        <EuiFlexItem grow={false}>
          <FieldIcon type={option.value.type === 'keyword' ? 'string' : option.value.type} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StyledFieldSpan className="euiSuggestItem__label euiSuggestItem__labelDisplay--expand">
            {option.value.field}
          </StyledFieldSpan>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <span className="euiSuggestItem__description euiSuggestItem__description--truncate">
            {option.value.description}
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  useEffect(() => {
    setSelected(() => {
      if (!field.value.length) return [];

      const selectedOption = find(ECSSchemaOptions, ['label', field.value]) ?? {
        label: field.value,
      };
      return [selectedOption];
    });
  }, [field.value]);

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
        prepend={
          <StyledFieldIcon
            size="l"
            type={
              selectedOptions[0]?.value?.type === 'keyword'
                ? 'string'
                : selectedOptions[0]?.value?.type
            }
          />
        }
        fullWidth
        placeholder="Select a single option"
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        singleSelection={{ asPlainText: true }}
        options={ECSSchemaOptions}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        customOptionText="Add {searchValue} as your occupation"
        renderOption={renderOption}
        rowHeight={32}
        isClearable={false}
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export const OsqueryColumnField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const { setValue } = field;
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);
  const [selectedOptions, setSelected] = useState(
    field.value.length ? [find(euiFieldProps?.options, ['label', field.value])] : []
  );

  const renderOsqueryOption = useCallback(
    (option, searchValue, contentClassName) => (
      <EuiFlexGroup
        className={`${contentClassName} euiSuggestItem`}
        alignItems="center"
        gutterSize="xs"
      >
        <EuiFlexItem grow={false}>
          <StyledFieldSpan className="euiSuggestItem__label euiSuggestItem__labelDisplay--expand">
            {option.value.name}
          </StyledFieldSpan>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <span className="euiSuggestItem__description euiSuggestItem__description--truncate">
            {option.value.description}
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const onCreateOsqueryOption = useCallback(
    (searchValue = []) => {
      const normalizedSearchValue = searchValue.trim().toLowerCase();

      if (!normalizedSearchValue) {
        return;
      }

      const newOption = {
        label: searchValue,
      };

      // Select the option.
      setSelected([newOption]);
      setValue(newOption.label);
    },
    [setValue, setSelected]
  );

  const handleChange = useCallback(
    (newSelectedOptions) => {
      setSelected(newSelectedOptions);
      setValue(newSelectedOptions[0]?.label ?? '');
    },
    [setValue, setSelected]
  );

  useEffect(() => {
    setSelected(() => {
      if (!field.value.length) return [];

      const selectedOption = find(euiFieldProps?.options, ['label', field.value]) ?? {
        label: field.value,
      };
      return [selectedOption];
    });
  }, [euiFieldProps?.options, setSelected, field.value]);

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
        fullWidth
        placeholder="Select a single option"
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        singleSelection={{ asPlainText: true }}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        onCreateOption={onCreateOsqueryOption}
        renderOption={renderOsqueryOption}
        rowHeight={32}
        isClearable={false}
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

interface ECSMappingEditorFormProps {
  osquerySchemaOptions: any[];
  defaultValue: Record<string, unknown>;
  onAdd?: () => void;
  onChange?: () => void;
  onDelete?: () => void;
}

export const ECSMappingEditorForm = ({
  osquerySchemaOptions,
  defaultValue,
  onAdd,
  onChange,
  onDelete,
}: ECSMappingEditorFormProps) => {
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
    defaultValue: defaultValue ?? {
      key: '',
      value: {
        field: '',
      },
    },
  });

  const { submit, reset } = form;

  const handleSubmit = useCallback(async () => {
    const { data, isValid } = await submit();

    if (isValid) {
      onAdd(data);
      reset();
    }
  }, [submit, onAdd, reset]);

  const handleChange = useCallback(async () => {
    if (!defaultValue) return;

    const { data, isValid } = await submit();

    if (isValid && onChange) {
      onChange(data);
    }
  }, [defaultValue, onChange, submit]);

  const handleDeleteClick = useCallback(() => {
    if (defaultValue?.key && onDelete) {
      onDelete(defaultValue.key);
    }
  }, [defaultValue, onDelete]);

  return (
    <Form form={form}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <CommonUseField path="key" component={ECSComboboxField} onChange={handleChange} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>{'<='}</EuiFlexItem>
            <EuiFlexItem>
              <CommonUseField
                path="value.field"
                component={OsqueryColumnField}
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                euiFieldProps={{
                  options: osquerySchemaOptions,
                }}
                onChange={handleChange}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {defaultValue ? (
                <EuiButtonIcon iconType="trash" color="danger" onClick={handleDeleteClick} />
              ) : (
                <EuiButtonIcon iconType="plus" color="primary" onClick={handleSubmit} />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </Form>
  );
};

export const ECSMappingEditorField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const { setValue, value } = field;
  const [osquerySchemaOptions, setOsquerySchemaOptions] = useState<unknown[]>([]);

  useEffect(() => {
    setOsquerySchemaOptions((currentValue) => {
      if (!rest.query) {
        return currentValue;
      }

      const columnNames = map(rest.query.toLowerCase().match(TABLE_NAMES_REGEX), trim);

      const suggestions = columnNames
        .map((columnName) => {
          const osqueryTable = find(osquerySchema, ['name', columnName]);

          if (osqueryTable) {
            return osqueryTable.columns.map((osqueryTableColumn) => ({
              label: osqueryTableColumn.name,
              value: osqueryTableColumn,
            }));
          }
          return [];
        })
        .flat();

      return suggestions;
    });
  }, [rest.query]);

  const handleAddRow = useCallback(
    ({ key, value }) => {
      if (key && value) {
        setValue((current) => ({
          ...current,
          [key]: value,
        }));
      }
    },
    [setValue]
  );

  const handleUpdateRow = useCallback(
    (currentKey) => ({ key, value }) => {
      console.error('handleUpadteRow', currentKey, key, value);
      if (key && value) {
        setValue((current) => ({
          ...current,
          [key]: value,
        }));
      }
    },
    [setValue]
  );

  const handleDeleteRow = useCallback(
    (key) => {
      if (key) {
        setValue((current) => {
          if (current[key]) {
            delete current[key];
          }
          return current;
        });
      }
    },
    [setValue]
  );

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.osquery.scheduledQueryGroup.form.ecsMappingSection.title"
                defaultMessage="ECS mapping"
              />
            </h5>
          </EuiTitle>
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.osquery.scheduledQueryGroup.form.ecsMappingSection.description"
              defaultMessage="Use the fields below to map results from this query to ECS fields."
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {Object.entries(value).map(([ecsKey, ecsValue]) => (
        <ECSMappingEditorForm
          key={ecsKey}
          osquerySchemaOptions={osquerySchemaOptions}
          // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
          defaultValue={{
            key: ecsKey,
            value: ecsValue,
          }}
          onChange={handleUpdateRow(ecsKey)}
          onDelete={handleDeleteRow}
        />
      ))}
      <ECSMappingEditorForm osquerySchemaOptions={osquerySchemaOptions} onAdd={handleAddRow} />
    </>
  );
};

// const AddField
