/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  castArray,
  each,
  isEmpty,
  find,
  orderBy,
  sortedUniqBy,
  isArray,
  map,
  reduce,
  trim,
  get,
} from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiComboBoxProps, EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiFormLabel,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiIcon,
  EuiSuperSelect,
} from '@elastic/eui';
import sqliteParser from '@appland/sql-parser';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import { useController, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import type { FormField } from '../../form/types';
import ECSSchema from '../../common/schemas/ecs/v8.4.0.json';
import osquerySchema from '../../common/schemas/osquery/v5.4.0.json';

import { FieldIcon } from '../../common/lib/kibana';
import type { FormArrayField } from '../../shared_imports';
import { OsqueryIcon } from '../../components/osquery_icon';
import { removeMultilines } from '../../../common/utils/build_query/remove_multilines';
import { prepareEcsFieldsToValidate } from '../../common/helpers';

export interface EcsMappingFormField {
  key: string;
  result: {
    type: string;
    value: string;
  };
}

export type EcsMappingSerialized = Record<
  string,
  {
    field?: string;
    value?: string;
  }
>;

const typeMap = {
  binary: 'binary',
  half_float: 'number',
  scaled_float: 'number',
  float: 'number',
  integer: 'number',
  long: 'number',
  short: 'number',
  byte: 'number',
  text: 'string',
  keyword: 'string',
  '': 'string',
  geo_point: 'geo_point',
  date: 'date',
  ip: 'ip',
  boolean: 'boolean',
  constant_keyword: 'string',
};

// @ts-expect-error update types
const ResultComboBox = styled(EuiComboBox)`
  &.euiComboBox {
    position: relative;
    left: -1px;

    .euiComboBox__inputWrap {
      border-radius: 0 6px 6px 0;
    }
  }
`;

const StyledEuiSuperSelect = styled(EuiSuperSelect)`
  min-width: 70px;
  border-radius: 6px 0 0 6px;

  .euiIcon {
    padding: 0;
    width: 18px;
    background: none;
  }
`;

const StyledFieldIcon = styled(FieldIcon)`
  width: 32px;

  > svg {
    padding: 0 6px !important;
  }
`;

const StyledFieldSpan = styled.span`
  padding-top: 0 !important;
  padding-bottom: 0 !important;
`;

const DescriptionWrapper = styled(EuiFlexItem)`
  overflow: hidden;
`;

// align the icon to the inputs
const StyledSemicolonWrapper = styled.div`
  margin-top: 8px;
`;

// align the icon to the inputs
const StyledButtonWrapper = styled.div`
  margin-top: 11px;
  width: 24px;
`;

const ECSFieldWrapper = styled(EuiFlexItem)`
  max-width: 100%;
`;

const SINGLE_SELECTION = { asPlainText: true };

const ECSSchemaOptions = ECSSchema.map((ecs) => ({
  label: ecs.field,
  value: ecs,
}));

type ECSSchemaOption = typeof ECSSchemaOptions[0];

interface ECSComboboxFieldProps extends FormField<string> {
  euiFieldProps: EuiComboBoxProps<ECSSchemaOption>;
  idAria?: string;
  error?: string;
}

const ECSComboboxFieldComponent: React.FC<ECSComboboxFieldProps> = ({
  euiFieldProps = {},
  idAria,
  onChange,
  value,
  error,
}) => {
  const [selectedOptions, setSelected] = useState<Array<EuiComboBoxOptionOption<ECSSchemaOption>>>(
    []
  );
  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);
  const { ecs_mapping: watchedEcsMapping } = useWatch() as unknown as {
    ecs_mapping: EcsMappingFormField[];
  };
  const handleChange = useCallback(
    (newSelectedOptions) => {
      setSelected(newSelectedOptions);
      onChange(newSelectedOptions[0]?.label ?? '');
    },
    [onChange]
  );

  // TODO: Create own component for this.
  const renderOption = useCallback(
    (option, searchValue, contentClassName) => (
      <EuiFlexGroup
        className={`${contentClassName} euiSuggestItem euiSuggestItem--truncate`}
        alignItems="center"
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          {
            // @ts-expect-error update types
            <FieldIcon type={typeMap[option.value.type] ?? option.value.type} />
          }
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StyledFieldSpan className="euiSuggestItem__label euiSuggestItem__label--expand">
            {option.value.field}
          </StyledFieldSpan>
        </EuiFlexItem>

        <DescriptionWrapper grow={false}>
          <StyledFieldSpan className="euiSuggestItem__description euiSuggestItem__description">
            {option.value.description}
          </StyledFieldSpan>
        </DescriptionWrapper>
      </EuiFlexGroup>
    ),
    []
  );

  const prepend = useMemo(
    () => (
      <StyledFieldIcon
        size="l"
        type={
          // @ts-expect-error update types
          typeMap[selectedOptions[0]?.value?.type] ?? selectedOptions[0]?.value?.type
        }
      />
    ),
    [selectedOptions]
  );

  const helpText = useMemo(() => {
    // @ts-expect-error update types
    let text = selectedOptions[0]?.value?.description;

    if (!text) return;

    // @ts-expect-error update types
    const example = selectedOptions[0]?.value?.example;
    if (example) {
      text += ` e.g. ${JSON.stringify(example)}`;
    }

    return text;
  }, [selectedOptions]);

  const availableECSSchemaOptions = useMemo(() => {
    const currentFormECSFieldValues = map(watchedEcsMapping, 'key');

    return ECSSchemaOptions.filter(({ label }) => !currentFormECSFieldValues.includes(label));
  }, [watchedEcsMapping]);

  useEffect(() => {
    // @ts-expect-error update types
    setSelected(() => {
      if (!value?.length) return [];

      const selectedOption = find(ECSSchemaOptions, ['label', value]);

      return selectedOption
        ? [selectedOption]
        : [
            {
              label: value,
              value: {
                value,
              },
            },
          ];
    });
  }, [value]);

  return (
    <EuiFormRow
      helpText={helpText}
      error={error}
      isInvalid={!!error}
      fullWidth
      describedByIds={describedByIds}
      isDisabled={euiFieldProps.isDisabled}
    >
      <EuiComboBox
        prepend={prepend}
        fullWidth
        singleSelection={SINGLE_SELECTION}
        // @ts-expect-error update types
        options={availableECSSchemaOptions}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        data-test-subj="ECS-field-input"
        renderOption={renderOption}
        rowHeight={32}
        isClearable
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export const ECSComboboxField = React.memo(ECSComboboxFieldComponent);

const OSQUERY_COLUMN_VALUE_TYPE_OPTIONS = [
  {
    value: 'field',
    inputDisplay: <OsqueryIcon size="m" />,
    dropdownDisplay: (
      <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <OsqueryIcon size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" className="eui-textNoWrap">
            <FormattedMessage
              id="xpack.osquery.pack.form.ecsMappingSection.osqueryValueOptionLabel"
              defaultMessage="Osquery value"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    value: 'value',
    inputDisplay: <EuiIcon type="user" size="m" />,
    dropdownDisplay: (
      <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="user" size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" className="eui-textNoWrap">
            <FormattedMessage
              id="xpack.osquery.pack.form.ecsMappingSection.staticValueOptionLabel"
              defaultMessage="Static value"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
];

const EMPTY_ARRAY: EuiComboBoxOptionOption[] = [];

interface OsqueryColumnFieldProps {
  euiFieldProps: EuiComboBoxProps<OsquerySchemaOption>;
  item: EcsMappingFormField;
  index: number;
  idAria?: string;
  isLastItem: boolean;
}

const OsqueryColumnFieldComponent: React.FC<OsqueryColumnFieldProps> = ({
  euiFieldProps,
  idAria,
  item,
  index,
  isLastItem,
}) => {
  const osqueryResultFieldValidator = (
    value: string,
    ecsMappingFormData: EcsMappingFormField[]
  ): string | undefined => {
    const currentMapping = ecsMappingFormData[index];

    if (!value.length && currentMapping.key.length) {
      return i18n.translate(
        'xpack.osquery.pack.queryFlyoutForm.osqueryResultFieldRequiredErrorMessage',
        {
          defaultMessage: 'Value field is required.',
        }
      );
    }

    if (!value.length || currentMapping.result.type !== 'field') return;

    const osqueryColumnExists = find(euiFieldProps.options, [
      'label',
      isArray(value) ? value[0] : value,
    ]);

    return !osqueryColumnExists
      ? i18n.translate(
          'xpack.osquery.pack.queryFlyoutForm.osqueryResultFieldValueMissingErrorMessage',
          {
            defaultMessage: 'The current query does not return a {columnName} field',
            values: {
              columnName: value,
            },
          }
        )
      : undefined;
  };

  const { setValue } = useFormContext();
  const { ecs_mapping: watchedEcsMapping } = useWatch() as unknown as {
    ecs_mapping: EcsMappingFormField[];
  };

  const { field: resultField, fieldState: resultFieldState } = useController({
    name: `ecs_mapping.${index}.result.value`,
    rules: {
      validate: (data) => osqueryResultFieldValidator(data, watchedEcsMapping),
    },
    defaultValue: '',
  });
  const itemPath = `ecs_mapping.${index}`;
  const resultValue = item.result;
  const inputRef = useRef<HTMLInputElement>();
  const [selectedOptions, setSelected] = useState<OsquerySchemaOption[]>([]);
  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);

  const renderOsqueryOption = useCallback(
    (option, searchValue, contentClassName) => (
      <EuiFlexGroup
        className={`${contentClassName} euiSuggestItem euiSuggestItem--truncate`}
        alignItems="center"
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          <StyledFieldSpan className="euiSuggestItem__label euiSuggestItem__label--expand">
            {option.value.suggestion_label}
          </StyledFieldSpan>
        </EuiFlexItem>
        <DescriptionWrapper grow={false}>
          <StyledFieldSpan className="euiSuggestItem__description euiSuggestItem__description">
            {option.value.description}
          </StyledFieldSpan>
        </DescriptionWrapper>
      </EuiFlexGroup>
    ),
    []
  );

  const handleKeyChange = useCallback(
    (newSelectedOptions) => {
      setSelected(newSelectedOptions);
      resultField.onChange(
        isArray(newSelectedOptions)
          ? map(newSelectedOptions, 'label')
          : newSelectedOptions[0]?.label ?? ''
      );
    },
    [resultField]
  );

  const isSingleSelection = useMemo(() => {
    const ecsData = get(watchedEcsMapping, `${index}`);
    if (ecsData?.key?.length && item.result.type === 'value') {
      const ecsKeySchemaOption = find(ECSSchemaOptions, ['label', ecsData?.key]);

      return ecsKeySchemaOption?.value?.normalization !== 'array';
    }

    if (!ecsData?.key?.length && isLastItem) {
      return true;
    }

    return !!ecsData?.key?.length;
  }, [index, isLastItem, item.result.type, watchedEcsMapping]);

  const onTypeChange = useCallback(
    (newType) => {
      if (newType !== item.result.type) {
        setValue(`${itemPath}.result.type`, newType);
        setValue(
          `${itemPath}.result.value`,
          newType === 'value' && isSingleSelection === false ? [] : ''
        );
      }
    },
    [isSingleSelection, item.result.type, itemPath, setValue]
  );

  const handleCreateOption = useCallback(
    (newOption: string) => {
      const trimmedNewOption = trim(newOption);

      if (!trimmedNewOption.length) return;

      if (isSingleSelection === false) {
        setValue(`${itemPath}.result.value`, [trimmedNewOption]);
        if (item.result.value.length) {
          setValue(`${itemPath}.result.value`, [...castArray(resultValue.value), trimmedNewOption]);
        } else {
          setValue(`${itemPath}.result.value`, [trimmedNewOption]);
        }

        inputRef.current?.blur();
      } else {
        setValue(`${itemPath}.result.value`, trimmedNewOption);
      }
    },
    [isSingleSelection, item.result.value.length, itemPath, resultValue.value, setValue]
  );

  const Prepend = useMemo(
    () => (
      <StyledEuiSuperSelect
        disabled={euiFieldProps.isDisabled}
        options={OSQUERY_COLUMN_VALUE_TYPE_OPTIONS}
        valueOfSelected={item.result.type || OSQUERY_COLUMN_VALUE_TYPE_OPTIONS[0].value}
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        popoverProps={{
          panelStyle: {
            minWidth: '250px',
          },
        }}
        onChange={onTypeChange}
      />
    ),
    [euiFieldProps.isDisabled, item.result.type, onTypeChange]
  );

  useEffect(() => {
    if (isSingleSelection && isArray(resultValue.value)) {
      setValue(`${itemPath}.result.value`, resultValue.value.join(' '));
    }

    if (!isSingleSelection && !isArray(resultValue.value)) {
      const value = resultValue.value.length ? [resultValue.value] : [];
      setValue(`${itemPath}.result.value`, value);
    }
  }, [index, isSingleSelection, itemPath, resultValue, resultValue.value, setValue]);

  useEffect(() => {
    // @ts-expect-error hard to type to satisfy TS, but it represents proper types
    setSelected((_: OsquerySchemaOption[]): OsquerySchemaOption[] | Array<{ label: string }> => {
      if (!resultValue.value.length) return [];

      // Static array values
      if (isArray(resultValue.value)) {
        return resultValue.value.map((value) => ({ label: value })) as OsquerySchemaOption[];
      }

      const selectedOption = find(euiFieldProps?.options, ['label', resultValue.value]) as
        | OsquerySchemaOption
        | undefined;

      return selectedOption ? [selectedOption] : [{ label: resultValue.value }];
    });
  }, [euiFieldProps?.options, setSelected, resultValue.value]);

  return (
    <EuiFormRow
      helpText={selectedOptions[0]?.value?.description}
      error={resultFieldState.error?.message}
      isInvalid={!!resultFieldState.error?.message?.length}
      fullWidth
      describedByIds={describedByIds}
      isDisabled={euiFieldProps.isDisabled}
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>{Prepend}</EuiFlexItem>
        <EuiFlexItem>
          <ResultComboBox
            onBlur={resultField.onBlur}
            value={resultField.value}
            name={resultField.name}
            error={resultFieldState.error?.message}
            // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
            inputRef={(ref: HTMLInputElement) => {
              inputRef.current = ref;
            }}
            fullWidth
            selectedOptions={selectedOptions}
            onChange={handleKeyChange}
            onCreateOption={handleCreateOption}
            renderOption={renderOsqueryOption}
            rowHeight={32}
            isClearable
            singleSelection={isSingleSelection ? SINGLE_SELECTION : false}
            options={(item.result.type === 'field' && euiFieldProps.options) || EMPTY_ARRAY}
            idAria={idAria}
            helpText={selectedOptions[0]?.value?.description}
            {...euiFieldProps}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

export const OsqueryColumnField = React.memo(OsqueryColumnFieldComponent);

export interface ECSMappingEditorFieldProps {
  euiFieldProps?: EuiComboBoxProps<{}>;
}

interface ECSMappingEditorFormProps {
  isDisabled?: boolean;
  osquerySchemaOptions: OsquerySchemaOption[];
  item: EcsMappingFormField;
  index: number;
  isLastItem: boolean;
  onAppend: (ecs_mapping: EcsMappingFormField[]) => void;
  onDelete?: FormArrayField['removeItem'];
}

export const defaultEcsFormData = {
  key: '',
  result: {
    type: 'field',
    value: '',
  },
};

export const ECSMappingEditorForm: React.FC<ECSMappingEditorFormProps> = ({
  isDisabled,
  osquerySchemaOptions,
  item,
  isLastItem,
  index,
  onDelete,
}) => {
  const ecsFieldValidator = (value: string, ecsMapping: EcsMappingFormField[]) => {
    const ecsCurrentMapping = ecsMapping[index].result.value;

    return !value.length && ecsCurrentMapping.length
      ? i18n.translate('xpack.osquery.pack.queryFlyoutForm.ecsFieldRequiredErrorMessage', {
          defaultMessage: 'ECS field is required.',
        })
      : undefined;
  };

  const { ecs_mapping: ecsMapping } = useWatch() as unknown as {
    ecs_mapping: EcsMappingFormField[];
  };
  const { field: ECSField, fieldState: ECSFieldState } = useController({
    name: `ecs_mapping.${index}.key`,
    rules: {
      validate: (value: string) => ecsFieldValidator(value, ecsMapping),
    },
    defaultValue: '',
  });

  const ecsComboBoxEuiFieldProps = useMemo(() => ({ isDisabled }), [isDisabled]);

  const handleDeleteClick = useCallback(() => {
    if (onDelete) {
      onDelete(index);
    }
  }, [index, onDelete]);

  return (
    <>
      <EuiFlexGroup data-test-subj="ECSMappingEditorForm" alignItems="flexStart" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="flexStart" gutterSize="s" wrap>
            <EuiFlexItem>
              <ECSComboboxField
                onChange={ECSField.onChange}
                onBlur={ECSField.onBlur}
                value={ECSField.value}
                name={ECSField.name}
                error={ECSFieldState.error?.message}
                euiFieldProps={ecsComboBoxEuiFieldProps}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <StyledSemicolonWrapper>
                <EuiText>:</EuiText>
              </StyledSemicolonWrapper>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="flexStart" gutterSize="s" wrap>
            <ECSFieldWrapper>
              <OsqueryColumnField
                item={item}
                index={index}
                isLastItem={isLastItem}
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                euiFieldProps={{
                  // @ts-expect-error update types
                  options: osquerySchemaOptions,
                  isDisabled,
                }}
              />
            </ECSFieldWrapper>
            {!isDisabled && (
              <EuiFlexItem grow={false}>
                <StyledButtonWrapper>
                  {!isLastItem && (
                    <EuiButtonIcon
                      aria-label={i18n.translate(
                        'xpack.osquery.pack.queryFlyoutForm.deleteECSMappingRowButtonAriaLabel',
                        {
                          defaultMessage: 'Delete ECS mapping row',
                        }
                      )}
                      iconType="trash"
                      color="danger"
                      onClick={handleDeleteClick}
                    />
                  )}
                </StyledButtonWrapper>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};

interface OsquerySchemaOption {
  label: string;
  value: {
    name: string;
    description: string;
    table: string;
    suggestion_label: string;
  };
}

interface OsqueryColumn {
  name: string;
  description: string;
  type: string;
  hidden: boolean;
  required: boolean;
  index: boolean;
}

export const ECSMappingEditorField = React.memo(
  ({ euiFieldProps }: ECSMappingEditorFieldProps) => {
    const { trigger } = useFormContext();
    const { fields, append, remove } = useFieldArray<{ ecs_mapping: EcsMappingFormField[] }>({
      name: 'ecs_mapping',
    });

    const itemsList = useRef<Array<{ id: string }>>([]);
    const [osquerySchemaOptions, setOsquerySchemaOptions] = useState<OsquerySchemaOption[]>([]);
    const { query, ...formData } = useWatch() as unknown as {
      query: string;
      ecs_mapping: EcsMappingFormField[];
    };

    useEffect(() => {
      // Additional 'suspended' validation of osquery ecs fields. fieldsToValidateOnChange doesn't work because it happens before the osquerySchema gets updated.
      const fieldsToValidate = prepareEcsFieldsToValidate(fields);
      // it is always at least 2 - empty fields
      if (fieldsToValidate.length > 2) {
        setTimeout(() => trigger('ecs_mapping'), 0);
      }
    }, [fields, query, trigger]);

    useEffect(() => {
      if (!query?.length) {
        return;
      }

      const oneLineQuery = removeMultilines(query);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ast: Record<string, any> | undefined;

      try {
        ast = sqliteParser(oneLineQuery)?.statement?.[0];
      } catch (e) {
        return;
      }

      const astOsqueryTables: Record<
        string,
        {
          columns: OsqueryColumn[];
          order: number;
        }
      > =
        reduce(
          ast,
          (acc, data) => {
            // select * from uptime
            if (data?.type === 'identifier' && data?.variant === 'table') {
              const osqueryTable = find(osquerySchema, ['name', data.name]);

              if (osqueryTable) {
                acc[data.alias || data.name] = {
                  columns: osqueryTable.columns,
                  order: Object.keys(acc).length,
                };
              }
            }

            // select * from uptime, routes
            if (data?.type === 'map' && data?.variant === 'join') {
              if (data?.source?.type === 'identifier' && data?.source?.variant === 'table') {
                const osqueryTable = find(osquerySchema, ['name', data?.source?.name]);

                if (osqueryTable) {
                  acc[data?.source?.alias || data?.source?.name] = {
                    columns: osqueryTable.columns,
                    order: Object.keys(acc).length,
                  };
                }
              }

              if (data?.source?.type === 'statement' && data?.source?.variant === 'compound') {
                if (
                  data?.source?.statement.from.type === 'identifier' &&
                  data?.source?.statement.from.variant === 'table'
                ) {
                  const osqueryTable = find(osquerySchema, [
                    'name',
                    data?.source?.statement.from.name,
                  ]);

                  if (osqueryTable) {
                    acc[data?.source?.statement.from.alias || data?.source?.statement.from.name] = {
                      columns: osqueryTable.columns,
                      order: Object.keys(acc).length,
                    };
                  }
                }
              }

              each(
                data?.map,
                (mapValue: {
                  type: string;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  source: { type: string; variant: string; name: any | string; alias: any };
                }) => {
                  if (mapValue?.type === 'join') {
                    if (
                      mapValue?.source?.type === 'identifier' &&
                      mapValue?.source?.variant === 'table'
                    ) {
                      const osqueryTable = find(osquerySchema, ['name', mapValue?.source?.name]);

                      if (osqueryTable) {
                        acc[mapValue?.source?.alias || mapValue?.source?.name] = {
                          columns: osqueryTable.columns,
                          order: Object.keys(acc).length,
                        };
                      }
                    }
                  }
                }
              );
            }

            return acc;
          },
          {} as Record<
            string,
            {
              columns: OsqueryColumn[];
              order: number;
            }
          >
        ) ?? {};

      // Table doesn't exist in osquery schema
      if (isEmpty(astOsqueryTables)) {
        return;
      }

      const suggestions = isArray(ast?.result)
        ? ast?.result
            ?.map((selectItem: { type: string; name: string; alias?: string }) => {
              if (selectItem.type === 'identifier') {
                /*
                  select * from routes, uptime;
                */
                if (ast?.result.length === 1 && selectItem.name === '*') {
                  return reduce(
                    astOsqueryTables,
                    (acc, { columns: osqueryColumns, order: tableOrder }, table) => {
                      acc.push(
                        ...osqueryColumns.map((osqueryColumn) => ({
                          label: osqueryColumn.name,
                          value: {
                            name: osqueryColumn.name,
                            description: osqueryColumn.description,
                            table,
                            tableOrder,
                            suggestion_label: osqueryColumn.name,
                          },
                        }))
                      );

                      return acc;
                    },
                    [] as OsquerySchemaOption[]
                  );
                }

                /*
                  select i.*, p.resident_size, p.user_time, p.system_time, time.minutes as counter from osquery_info i, processes p, time where p.pid = i.pid;
                */

                const [table, column] = selectItem.name.includes('.')
                  ? selectItem.name?.split('.')
                  : [Object.keys(astOsqueryTables)[0], selectItem.name];

                if (column === '*' && astOsqueryTables[table]) {
                  const { columns: osqueryColumns, order: tableOrder } = astOsqueryTables[table];

                  return osqueryColumns.map((osqueryColumn) => ({
                    label: osqueryColumn.name,
                    value: {
                      name: osqueryColumn.name,
                      description: osqueryColumn.description,
                      table,
                      tableOrder,
                      suggestion_label: `${osqueryColumn.name}`,
                    },
                  }));
                }

                if (astOsqueryTables[table]) {
                  const osqueryColumn = find(astOsqueryTables[table].columns, ['name', column]);

                  if (osqueryColumn) {
                    const label = selectItem.alias ?? column;

                    return [
                      {
                        label,
                        value: {
                          name: osqueryColumn.name,
                          description: osqueryColumn.description,
                          table,
                          tableOrder: astOsqueryTables[table].order,
                          suggestion_label: `${label}`,
                        },
                      },
                    ];
                  }
                }
              }

              /*
                SELECT pid, uid, name, ROUND((
                  (user_time + system_time) / (cpu_time.tsb - cpu_time.itsb)
                ) * 100, 2) AS percentage
                FROM processes, (
                SELECT (
                  SUM(user) + SUM(nice) + SUM(system) + SUM(idle) * 1.0) AS tsb,
                  SUM(COALESCE(idle, 0)) + SUM(COALESCE(iowait, 0)) AS itsb
                  FROM cpu_time
                ) AS cpu_time
                ORDER BY user_time+system_time DESC
                LIMIT 5;
              */

              if (selectItem.type === 'function' && selectItem.alias) {
                return [
                  {
                    label: selectItem.alias,
                    value: {
                      name: selectItem.alias,
                      description: '',
                      table: '',
                      tableOrder: -1,
                      suggestion_label: selectItem.alias,
                    },
                  },
                ];
              }

              return [];
            })
            .flat()
        : [];

      // Remove column duplicates by keeping the column from the table that appears last in the query
      const newOptions = sortedUniqBy(
        orderBy(suggestions, ['value.suggestion_label', 'value.tableOrder'], ['asc', 'desc']),
        'label'
      );
      setOsquerySchemaOptions((prevValue) =>
        !deepEqual(prevValue, newOptions) ? newOptions : prevValue
      );
    }, [query]);

    useEffect(() => {
      const ecsList = formData?.ecs_mapping;
      const lastEcs = formData?.ecs_mapping?.[itemsList?.current.length - 1];

      // we skip appending on remove
      if (itemsList?.current?.length < ecsList?.length) {
        return;
      }

      // list contains ecs already, and the last item has values provided
      if (
        (ecsList?.length === itemsList.current.length &&
          lastEcs?.key?.length &&
          lastEcs?.result?.value?.length) ||
        !fields?.length
      ) {
        return append(defaultEcsFormData);
      }
    }, [append, fields, formData]);

    return (
      <>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h5>
                <FormattedMessage
                  id="xpack.osquery.pack.form.ecsMappingSection.title"
                  defaultMessage="ECS mapping"
                />
              </h5>
            </EuiTitle>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.osquery.pack.form.ecsMappingSection.description"
                defaultMessage="Use the fields below to map results from this query to ECS fields."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFormLabel>
              <FormattedMessage
                id="xpack.osquery.pack.queryFlyoutForm.mappingEcsFieldLabel"
                defaultMessage="ECS field"
              />
            </EuiFormLabel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormLabel>
              <FormattedMessage
                id="xpack.osquery.pack.queryFlyoutForm.mappingValueFieldLabel"
                defaultMessage="Value"
              />
            </EuiFormLabel>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />

        {fields.map((item, index, array) => {
          itemsList.current = array;

          return (
            <div key={item.id}>
              <ECSMappingEditorForm
                osquerySchemaOptions={osquerySchemaOptions}
                item={item}
                index={index}
                onAppend={append}
                isLastItem={index === array.length - 1}
                onDelete={remove}
                isDisabled={!!euiFieldProps?.isDisabled}
              />
            </div>
          );
        })}
      </>
    );
  },
  (prevProps, nextProps) => deepEqual(prevProps.euiFieldProps, nextProps.euiFieldProps)
);

// eslint-disable-next-line import/no-default-export
export default ECSMappingEditorField;
