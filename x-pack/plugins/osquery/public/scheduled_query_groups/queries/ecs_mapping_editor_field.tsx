/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { produce } from 'immer';
import { find, sortBy, isArray } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Parser } from 'node-sql-parser';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import ECSSchema from '../../common/schemas/ecs/v1.10.0.json';
import osquerySchema from '../../common/schemas/osquery/v4.9.0.json';

import { FieldIcon } from '../../common/lib/kibana';
import {
  FIELD_TYPES,
  Form,
  FieldHook,
  getFieldValidityAndErrorMessage,
  useForm,
  useFormData,
  Field,
  getUseField,
} from '../../shared_imports';

export const CommonUseField = getUseField({ component: Field });

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
  const { setValue } = field;
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

      const selectedOption = find(ECSSchemaOptions, ['label', field.value]);

      return selectedOption ? [selectedOption] : [];
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

export const OsqueryColumnField = ({
  field,
  euiFieldProps = {},
  idAria,
  query,
  ...rest
}: Props) => {
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
            {option.value.suggestion_label}
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

      const selectedOption = find(euiFieldProps?.options, ['label', field.value]);
      return selectedOption ? [selectedOption] : [];
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
        prepend={selectedOptions.length ? selectedOptions[0].value?.table : null}
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
  query: string;
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
  const currentFormData = useRef(defaultValue);
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

  const [formData] = useFormData({ form });

  const handleSubmit = useCallback(async () => {
    const { data, isValid } = await submit();

    if (isValid) {
      onAdd(data);
      reset();
    }
  }, [submit, onAdd, reset]);

  useEffect(() => {
    if (defaultValue && onChange && !deepEqual(formData, currentFormData.current)) {
      console.error(currentFormData.current, formData);

      currentFormData.current = formData;
      onChange(formData);
    }
  }, [formData]);

  const handleDeleteClick = useCallback(() => {
    if (defaultValue?.key && onDelete) {
      onDelete(defaultValue.key);
    }
  }, [defaultValue, onDelete]);

  return (
    <Form form={form}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <CommonUseField path="key" component={ECSComboboxField} />
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

export const ECSMappingEditorField = ({ field, query }: Props) => {
  const { setValue, value } = field;
  const [osquerySchemaOptions, setOsquerySchemaOptions] = useState<unknown[]>([]);

  useEffect(() => {
    setOsquerySchemaOptions((currentValue) => {
      if (!query?.length) {
        return currentValue;
      }

      const parser = new Parser();
      let ast;

      try {
        const parsedQuery = parser.astify(query);
        ast = isArray(parsedQuery) ? parsedQuery[0] : parsedQuery;
      } catch (e) {
        return currentValue;
      }

      const astOsqueryTables = ast?.from?.reduce((acc, table) => {
        const osqueryTable = find(osquerySchema, ['name', table.table]);

        if (osqueryTable) {
          acc[table.as ?? table.table] = osqueryTable.columns;
        }

        return acc;
      }, {});

      // Table doesn't exist in osquery schema
      if (!isArray(ast?.columns) && ast?.columns !== '*' && !astOsqueryTables[ast.from[0].table]) {
        return currentValue;
      }
      /*
        Simple query
        select * from users;
      */
      if (ast?.columns === '*' && astOsqueryTables[ast.from[0].table]) {
        const tableName = ast.from[0].as ?? ast.from[0].table;

        return astOsqueryTables[ast.from[0].table].map((osqueryColumn) => ({
          label: osqueryColumn.name,
          value: {
            name: osqueryColumn.name,
            description: osqueryColumn.description,
            table: tableName,
            suggestion_label: `${tableName}.${osqueryColumn.name}`,
          },
        }));
      }

      /*
       Advanced query
       select i.*, p.resident_size, p.user_time, p.system_time, time.minutes as counter from osquery_info i, processes p, time where p.pid = i.pid;
      */
      const suggestions = ast?.columns
        ?.map((column) => {
          if (column.expr.column === '*') {
            return astOsqueryTables[column.expr.table].map((osqueryColumn) => ({
              label: osqueryColumn.name,
              value: {
                name: osqueryColumn.name,
                description: osqueryColumn.description,
                table: column.expr.table,
                suggestion_label: `${column.expr.table}.${osqueryColumn.name}`,
              },
            }));
          }

          if (astOsqueryTables[column.expr.table]) {
            const osqueryColumn = find(astOsqueryTables[column.expr.table], [
              'name',
              column.expr.column,
            ]);
            const label = column.as ?? column.expr.column;

            return [
              {
                label: column.as ?? column.expr.column,
                value: {
                  name: osqueryColumn.name,
                  description: osqueryColumn.description,
                  table: column.expr.table,
                  suggestion_label: `${column.expr.table}.${label}`,
                },
              },
            ];
          }

          return [];
        })
        .flat();

      return sortBy(suggestions, 'value.suggestion_label');
    });
  }, [query]);

  const handleAddRow = useCallback(
    ({ key, value }) => {
      if (key && value) {
        setValue(
          produce((draft) => {
            draft[key] = value;
            return draft;
          })
        );
      }
    },
    [setValue]
  );

  const handleUpdateRow = useCallback(
    (currentKey) => ({ key, value }) => {
      console.error('handleUpadteRow', currentKey, key, value);
      if (key && value) {
        setValue(
          produce((draft) => {
            if (currentKey !== key) {
              delete draft[currentKey];
            }

            draft[key] = value;

            return draft;
          })
        );
      }
    },
    [setValue]
  );

  const handleDeleteRow = useCallback(
    (key) => {
      if (key) {
        setValue(
          produce((draft) => {
            if (draft[key]) {
              delete draft[key];
            }
            return draft;
          })
        );
      }
    },
    [setValue]
  );

  console.error('ssssssss', value);

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
