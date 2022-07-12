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
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFormLabel,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
  EuiComboBoxProps,
  EuiComboBoxOptionOption,
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

import { prepareEcsFieldsToValidate } from '../../common/helpers';
import ECSSchema from '../../common/schemas/ecs/v8.2.0.json';
import osquerySchema from '../../common/schemas/osquery/v5.2.2.json';

import { FieldIcon } from '../../common/lib/kibana';
import {
  FIELD_TYPES,
  FieldHook,
  getFieldValidityAndErrorMessage,
  useFormData,
  Field,
  getUseField,
  fieldValidators,
  ValidationFuncArg,
  UseMultiFields,
  UseArray,
  ArrayItem,
  FormArrayField,
  useFormContext,
} from '../../shared_imports';
import { OsqueryIcon } from '../../components/osquery_icon';
import { removeMultilines } from '../../../common/utils/build_query/remove_multilines';

export const CommonUseField = getUseField({ component: Field });

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

const StyledEuiSuperSelect = styled(EuiSuperSelect)`
  min-width: 70px;
  border-radius: 6px 0 0 6px;

  .euiIcon {
    padding: 0;
    width: 18px;
    background: none;
  }
`;

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

interface ECSComboboxFieldProps {
  field: FieldHook<string>;
  euiFieldProps: EuiComboBoxProps<ECSSchemaOption>;
  idAria?: string;
}

const ECSComboboxFieldComponent: React.FC<ECSComboboxFieldProps> = ({
  field,
  euiFieldProps = {},
  idAria,
}) => {
  const { setValue } = field;
  const [selectedOptions, setSelected] = useState<Array<EuiComboBoxOptionOption<ECSSchemaOption>>>(
    []
  );
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);
  const [formData] = useFormData();

  const handleChange = useCallback(
    (newSelectedOptions) => {
      setSelected(newSelectedOptions);
      setValue(newSelectedOptions[0]?.label ?? '');
    },
    [setValue]
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
          <StyledFieldSpan className="euiSuggestItem__label euiSuggestItem__labelDisplay--expand">
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
    const currentFormECSFieldValues = map(formData.ecs_mapping, 'key');

    return ECSSchemaOptions.filter(({ label }) => !currentFormECSFieldValues.includes(label));
  }, [formData.ecs_mapping]);

  useEffect(() => {
    // @ts-expect-error update types
    setSelected(() => {
      if (!field.value.length) return [];

      const selectedOption = find(ECSSchemaOptions, ['label', field.value]);

      return selectedOption
        ? [selectedOption]
        : [
            {
              label: field.value,
              value: {
                value: field.value,
              },
            },
          ];
    });
  }, [field.value]);

  return (
    <EuiFormRow
      label={field.label}
      helpText={helpText}
      error={errorMessage}
      isInvalid={isInvalid}
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
  resultType: FieldHook<string>;
  resultValue: FieldHook<string | string[]>;
  euiFieldProps: EuiComboBoxProps<OsquerySchemaOption>;
  item: ArrayItem;
  idAria?: string;
}

const OsqueryColumnFieldComponent: React.FC<OsqueryColumnFieldProps> = ({
  resultType,
  resultValue,
  euiFieldProps = {},
  idAria,
  item,
}) => {
  const inputRef = useRef<HTMLInputElement>();
  const { setValue } = resultValue;
  const { value: typeValue, setValue: setType } = resultType;
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(resultValue);
  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);
  const [selectedOptions, setSelected] = useState<
    Array<EuiComboBoxOptionOption<OsquerySchemaOption>>
  >([]);
  const [formData] = useFormData();

  const renderOsqueryOption = useCallback(
    (option, searchValue, contentClassName) => (
      <EuiFlexGroup
        className={`${contentClassName} euiSuggestItem euiSuggestItem--truncate`}
        alignItems="center"
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          <StyledFieldSpan className="euiSuggestItem__label euiSuggestItem__labelDisplay--expand">
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

  const handleChange = useCallback(
    (newSelectedOptions) => {
      setSelected(newSelectedOptions);
      setValue(
        isArray(newSelectedOptions)
          ? map(newSelectedOptions, 'label')
          : newSelectedOptions[0]?.label ?? ''
      );
    },
    [setValue, setSelected]
  );

  const isSingleSelection = useMemo(() => {
    const ecsKey = get(formData, item.path)?.key;
    if (ecsKey?.length && typeValue === 'value') {
      const ecsKeySchemaOption = find(ECSSchemaOptions, ['label', ecsKey]);

      return ecsKeySchemaOption?.value?.normalization !== 'array';
    }

    return !!ecsKey?.length;
  }, [typeValue, formData, item.path]);

  const onTypeChange = useCallback(
    (newType) => {
      if (newType !== typeValue) {
        setType(newType);
        setValue(newType === 'value' && isSingleSelection === false ? [] : '');
      }
    },
    [typeValue, setType, setValue, isSingleSelection]
  );

  const handleCreateOption = useCallback(
    (newOption: string) => {
      const trimmedNewOption = trim(newOption);

      if (!trimmedNewOption.length) return;

      if (isSingleSelection === false) {
        setValue([trimmedNewOption]);
        if (resultValue.value.length) {
          setValue([...castArray(resultValue.value), trimmedNewOption]);
        } else {
          setValue([trimmedNewOption]);
        }

        inputRef.current?.blur();
      } else {
        setValue(trimmedNewOption);
      }
    },
    [isSingleSelection, resultValue.value, setValue]
  );

  const Prepend = useMemo(
    () => (
      <StyledEuiSuperSelect
        disabled={euiFieldProps.isDisabled}
        options={OSQUERY_COLUMN_VALUE_TYPE_OPTIONS}
        valueOfSelected={typeValue || OSQUERY_COLUMN_VALUE_TYPE_OPTIONS[0].value}
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        popoverProps={{
          panelStyle: {
            minWidth: '250px',
          },
        }}
        onChange={onTypeChange}
      />
    ),
    [euiFieldProps.isDisabled, onTypeChange, typeValue]
  );

  useEffect(() => {
    if (isSingleSelection && isArray(resultValue.value)) {
      setValue(resultValue.value.join(' '));
    }

    if (!isSingleSelection && !isArray(resultValue.value)) {
      setValue(resultValue.value.length ? [resultValue.value] : []);
    }
  }, [isSingleSelection, resultValue.value, setValue]);

  useEffect(() => {
    setSelected(() => {
      if (!resultValue.value.length) return [];

      // Static array values
      if (isArray(resultValue.value)) {
        return resultValue.value.map((value) => ({ label: value }));
      }

      const selectedOption = find(euiFieldProps?.options, ['label', resultValue.value]);

      return selectedOption ? [selectedOption] : [{ label: resultValue.value }];
    });
  }, [euiFieldProps?.options, setSelected, resultValue.value]);

  return (
    <EuiFormRow
      // @ts-expect-error update types
      helpText={selectedOptions[0]?.value?.description}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={describedByIds}
      isDisabled={euiFieldProps.isDisabled}
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>{Prepend}</EuiFlexItem>
        <EuiFlexItem>
          <ResultComboBox
            // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
            inputRef={(ref: HTMLInputElement) => {
              inputRef.current = ref;
            }}
            fullWidth
            selectedOptions={selectedOptions}
            onChange={handleChange}
            onCreateOption={handleCreateOption}
            renderOption={renderOsqueryOption}
            rowHeight={32}
            isClearable
            {...euiFieldProps}
            singleSelection={isSingleSelection ? SINGLE_SELECTION : false}
            options={(typeValue === 'field' && euiFieldProps.options) || EMPTY_ARRAY}
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
  item: ArrayItem;
  isLastItem?: boolean;
  onDelete?: FormArrayField['removeItem'];
}

const ecsFieldValidator = (
  args: ValidationFuncArg<ECSMappingEditorFormData, ECSMappingEditorFormData['key']> & {
    customData: {
      value: {
        editForm: boolean;
      };
    };
  }
) => {
  const editForm: boolean = args.customData.value?.editForm;
  const rootPath = args.path.split('.')[0];

  const fieldRequiredError = fieldValidators.emptyField(
    i18n.translate('xpack.osquery.pack.queryFlyoutForm.ecsFieldRequiredErrorMessage', {
      defaultMessage: 'ECS field is required.',
    })
  )(args);

  if (
    fieldRequiredError &&
    // @ts-expect-error update types
    ((!editForm && args.formData[`${rootPath}.result.value`]?.length) || editForm)
  ) {
    return fieldRequiredError;
  }

  return undefined;
};

const osqueryResultFieldValidator = async (
  args: ValidationFuncArg<ECSMappingEditorFormData, ECSMappingEditorFormData['value']['value']> & {
    customData: {
      value: {
        editForm: boolean;
        osquerySchemaOptions: OsquerySchemaOption[];
      };
    };
  }
) => {
  const rootPath = args.path.split('.')[0];
  const { editForm, osquerySchemaOptions } = args.customData.value;
  const fieldRequiredError = fieldValidators.emptyField(
    i18n.translate('xpack.osquery.pack.queryFlyoutForm.osqueryResultFieldRequiredErrorMessage', {
      defaultMessage: 'Value is required.',
    })
  )(args);

  // @ts-expect-error update types
  if (fieldRequiredError && ((!editForm && args.formData[`${rootPath}.key`]?.length) || editForm)) {
    return fieldRequiredError;
  }

  // @ts-expect-error update types
  if (!args.value?.length || args.formData[`${rootPath}.result.type`] !== 'field') return;

  const osqueryColumnExists = find(osquerySchemaOptions, [
    'label',
    isArray(args.value) ? args.value[0] : args.value,
  ]);

  return !osqueryColumnExists
    ? {
        code: 'ERR_FIELD_FORMAT',
        path: args.path,
        message: i18n.translate(
          'xpack.osquery.pack.queryFlyoutForm.osqueryResultFieldValueMissingErrorMessage',
          {
            defaultMessage: 'The current query does not return a {columnName} field',
            values: {
              columnName: args.value,
            },
          }
        ),
      }
    : undefined;
};

interface ECSMappingEditorFormData {
  key: string;
  value: {
    field?: string;
    value?: string;
  };
}

export const ECSMappingEditorForm: React.FC<ECSMappingEditorFormProps> = ({
  isDisabled,
  osquerySchemaOptions,
  item,
  isLastItem,
  onDelete,
}) => {
  const MultiFields = useMemo(
    () => (
      <UseMultiFields
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        fields={{
          resultType: {
            path: `${item.path}.result.type`,
            config: {
              valueChangeDebounceTime: 300,
              defaultValue: OSQUERY_COLUMN_VALUE_TYPE_OPTIONS[0].value,
              type: FIELD_TYPES.COMBO_BOX,
              fieldsToValidateOnChange: [`${item.path}.key`, `${item.path}.result.value`],
            },
          },
          resultValue: {
            path: `${item.path}.result.value`,
            validationData: {
              osquerySchemaOptions,
              editForm: !isLastItem,
            },
            readDefaultValueOnForm: !item.isNew,
            config: {
              valueChangeDebounceTime: 300,
              type: FIELD_TYPES.COMBO_BOX,
              fieldsToValidateOnChange: [`${item.path}.key`, `${item.path}.result.value`],
              validations: [
                {
                  // @ts-expect-error update types
                  validator: osqueryResultFieldValidator,
                },
              ],
            },
          },
        }}
      >
        {(fields) => (
          <OsqueryColumnField
            {...fields}
            item={item}
            // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
            euiFieldProps={{
              // @ts-expect-error update types
              options: osquerySchemaOptions,
              isDisabled,
            }}
          />
        )}
      </UseMultiFields>
    ),
    [item, osquerySchemaOptions, isLastItem, isDisabled]
  );

  const ecsComboBoxEuiFieldProps = useMemo(() => ({ isDisabled }), [isDisabled]);

  const validationData = useMemo(() => ({ editForm: !isLastItem }), [isLastItem]);

  const config = useMemo(
    () => ({
      valueChangeDebounceTime: 300,
      fieldsToValidateOnChange: [`${item.path}.key`, `${item.path}.result.value`],
      validations: [
        {
          validator: ecsFieldValidator,
        },
      ],
    }),
    [item.path]
  );

  const handleDeleteClick = useCallback(() => {
    if (onDelete) {
      onDelete(item.id);
    }
  }, [item.id, onDelete]);

  return (
    <>
      <EuiFlexGroup data-test-subj="ECSMappingEditorForm" alignItems="flexStart" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="flexStart" gutterSize="s" wrap>
            <EuiFlexItem>
              <CommonUseField
                path={`${item.path}.key`}
                component={ECSComboboxField}
                euiFieldProps={ecsComboBoxEuiFieldProps}
                validationData={validationData}
                readDefaultValueOnForm={!item.isNew}
                // @ts-expect-error update types
                config={config}
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
            <ECSFieldWrapper>{MultiFields}</ECSFieldWrapper>
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
    const lastItemPath = useRef<string>();
    const onAdd = useRef<FormArrayField['addItem']>();
    const itemsList = useRef<ArrayItem[]>([]);
    const [osquerySchemaOptions, setOsquerySchemaOptions] = useState<OsquerySchemaOption[]>([]);
    const [{ query, ...formData }, formDataSerializer, isMounted] = useFormData();

    const { validateFields } = useFormContext();

    useEffect(() => {
      // Additional 'suspended' validation of osquery ecs fields. fieldsToValidateOnChange doesn't work because it happens before the osquerySchema gets updated.
      const fieldsToValidate = prepareEcsFieldsToValidate(itemsList.current);
      // it is always at least 2 - empty fields
      if (fieldsToValidate.length > 2) {
        setTimeout(() => validateFields(fieldsToValidate), 0);
      }
    }, [query, validateFields]);

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

    useLayoutEffect(() => {
      if (isMounted) {
        if (!lastItemPath.current && onAdd.current) {
          onAdd.current();

          return;
        }

        if (euiFieldProps?.isDisabled) {
          return;
        }

        const itemKey = get(formData, `${lastItemPath.current}.key`);

        if (itemKey) {
          const serializedFormData = formDataSerializer();
          const itemValue =
            serializedFormData.ecs_mapping &&
            (serializedFormData.ecs_mapping[`${itemKey}`]?.field ||
              serializedFormData.ecs_mapping[`${itemKey}`]?.value);

          if (itemValue && onAdd.current) {
            onAdd.current();
          }
        }
      }
    }, [euiFieldProps?.isDisabled, formData, formDataSerializer, isMounted, onAdd]);

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
        <UseArray path="ecs_mapping">
          {({ items, addItem, removeItem }) => {
            lastItemPath.current = items[items.length - 1]?.path;
            onAdd.current = addItem;
            itemsList.current = items;

            return (
              <>
                {items.map((item, index) => (
                  <ECSMappingEditorForm
                    key={item.id}
                    osquerySchemaOptions={osquerySchemaOptions}
                    item={item}
                    isLastItem={index === items.length - 1}
                    onDelete={removeItem}
                    isDisabled={!!euiFieldProps?.isDisabled}
                  />
                ))}
              </>
            );
          }}
        </UseArray>
      </>
    );
  },
  (prevProps, nextProps) => deepEqual(prevProps.euiFieldProps, nextProps.euiFieldProps)
);

// eslint-disable-next-line import/no-default-export
export default ECSMappingEditorField;
