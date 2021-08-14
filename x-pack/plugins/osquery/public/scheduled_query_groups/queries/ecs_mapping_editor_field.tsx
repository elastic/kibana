/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { produce } from 'immer';
import { find, sortBy, isArray, map } from 'lodash';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
  MutableRefObject,
} from 'react';
import {
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
} from '@elastic/eui';
import { Parser, Select } from 'node-sql-parser';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';
import deepmerge from 'deepmerge';

import ECSSchema from '../../common/schemas/ecs/v1.11.0.json';
import osquerySchema from '../../common/schemas/osquery/v4.9.0.json';

import { FieldIcon } from '../../common/lib/kibana';
import {
  FIELD_TYPES,
  Form,
  FormData,
  FieldHook,
  getFieldValidityAndErrorMessage,
  useForm,
  useFormData,
  Field,
  getUseField,
  fieldValidators,
  ValidationFuncArg,
} from '../../shared_imports';

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

const StyledFieldIcon = styled(FieldIcon)`
  width: 32px;
  padding: 0 4px;
`;

const StyledFieldSpan = styled.span`
  padding-top: 0 !important;
  padding-bottom: 0 !important;
`;

// align the icon to the inputs
const StyledButtonWrapper = styled.div`
  margin-top: 32px;
`;

const singleSelection = { asPlainText: true };

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

export const ECSComboboxField: React.FC<ECSComboboxFieldProps> = ({
  field,
  euiFieldProps = {},
  idAria,
  ...rest
}) => {
  const { setValue } = field;
  const [selectedOptions, setSelected] = useState<Array<EuiComboBoxOptionOption<ECSSchemaOption>>>(
    []
  );
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);

  const handleChange = useCallback(
    (newSelectedOptions) => {
      setSelected(newSelectedOptions);
      setValue(newSelectedOptions[0]?.label ?? '');
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

        <EuiFlexItem grow={false}>
          <span className="euiSuggestItem__description euiSuggestItem__description--truncate">
            {option.value.description}
          </span>
        </EuiFlexItem>
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
          selectedOptions[0]?.value?.type === 'keyword' ? 'string' : selectedOptions[0]?.value?.type
        }
      />
    ),
    [selectedOptions]
  );

  useEffect(() => {
    // @ts-expect-error update types
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
        prepend={prepend}
        fullWidth
        singleSelection={singleSelection}
        // @ts-expect-error update types
        options={ECSSchemaOptions}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        renderOption={renderOption}
        rowHeight={32}
        isClearable
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

interface OsqueryColumnFieldProps {
  field: FieldHook<string>;
  euiFieldProps: EuiComboBoxProps<OsquerySchemaOption>;
  idAria?: string;
}

export const OsqueryColumnField: React.FC<OsqueryColumnFieldProps> = ({
  field,
  euiFieldProps = {},
  idAria,
  ...rest
}) => {
  const { setErrors, setValue } = field;
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);
  const [selectedOptions, setSelected] = useState<
    Array<EuiComboBoxOptionOption<OsquerySchemaOption>>
  >([]);

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

      return selectedOption ? [selectedOption] : [{ label: field.value }];
    });
  }, [euiFieldProps?.options, setSelected, field.value, setErrors]);

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
        singleSelection={singleSelection}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        onCreateOption={onCreateOsqueryOption}
        renderOption={renderOsqueryOption}
        rowHeight={32}
        isClearable
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export interface ECSMappingEditorFieldRef {
  validate: () => Promise<
    | Record<
        string,
        {
          field: string;
        }
      >
    | false
    | {}
  >;
}

export interface ECSMappingEditorFieldProps {
  field: FieldHook<string>;
  query: string;
  fieldRef: MutableRefObject<ECSMappingEditorFieldRef>;
}

interface ECSMappingEditorFormProps {
  osquerySchemaOptions: OsquerySchemaOption[];
  defaultValue?: FormData;
  onAdd?: (payload: FormData) => void;
  onChange?: (payload: FormData) => void;
  onDelete?: (key: string) => void;
}

const getEcsFieldValidator = (editForm: boolean) => (
  args: ValidationFuncArg<ECSMappingEditorFormData, ECSMappingEditorFormData['key']>
) => {
  const fieldRequiredError = fieldValidators.emptyField(
    i18n.translate(
      'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.ecsFieldRequiredErrorMessage',
      {
        defaultMessage: 'ECS field is required.',
      }
    )
  )(args);

  if (fieldRequiredError && (!!(!editForm && args.formData.value?.field.length) || editForm)) {
    return fieldRequiredError;
  }

  return undefined;
};

const getOsqueryResultFieldValidator = (
  osquerySchemaOptions: OsquerySchemaOption[],
  editForm: boolean
) => (
  args: ValidationFuncArg<ECSMappingEditorFormData, ECSMappingEditorFormData['value']['field']>
) => {
  const fieldRequiredError = fieldValidators.emptyField(
    i18n.translate(
      'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.osqueryResultFieldRequiredErrorMessage',
      {
        defaultMessage: 'Osquery result is required.',
      }
    )
  )(args);

  if (fieldRequiredError && ((!editForm && args.formData.key.length) || editForm)) {
    return fieldRequiredError;
  }

  if (!args.value.length) return;

  const osqueryColumnExists = find(osquerySchemaOptions, ['label', args.value]);

  return !osqueryColumnExists
    ? {
        code: 'ERR_FIELD_FORMAT',
        path: args.path,
        message: i18n.translate(
          'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.osqueryResultFieldValueMissingErrorMessage',
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

const FORM_DEFAULT_VALUE = {
  key: '',
  value: { field: '' },
};

interface ECSMappingEditorFormData {
  key: string;
  value: {
    field: string;
  };
}

interface ECSMappingEditorFormRef {
  validate: () => Promise<{
    data: ECSMappingEditorFormData | {};
    isValid: boolean;
  }>;
}

export const ECSMappingEditorForm = forwardRef<ECSMappingEditorFormRef, ECSMappingEditorFormProps>(
  ({ osquerySchemaOptions, defaultValue, onAdd, onChange, onDelete }, ref) => {
    const editForm = !!defaultValue;
    const currentFormData = useRef(defaultValue);
    const formSchema = {
      key: {
        label: i18n.translate('xpack.osquery.scheduledQueryGroup.queryFlyoutForm.ecsFieldLabel', {
          defaultMessage: 'ECS field',
        }),
        type: FIELD_TYPES.COMBO_BOX,
        fieldsToValidateOnChange: ['value.field'],
        validations: [
          {
            validator: getEcsFieldValidator(editForm),
          },
        ],
      },
      'value.field': {
        label: i18n.translate(
          'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.osqueryResultFieldLabel',
          {
            defaultMessage: 'Osquery result',
          }
        ),
        type: FIELD_TYPES.COMBO_BOX,
        fieldsToValidateOnChange: ['key'],
        validations: [
          {
            validator: getOsqueryResultFieldValidator(osquerySchemaOptions, editForm),
          },
        ],
      },
    };

    const { form } = useForm({
      schema: formSchema,
      defaultValue: defaultValue ?? FORM_DEFAULT_VALUE,
    });

    const { submit, reset, validate, __validateFields } = form;

    const [formData] = useFormData({ form });

    const handleSubmit = useCallback(async () => {
      validate();
      __validateFields(['value.field']);
      const { data, isValid } = await submit();

      if (isValid) {
        if (onAdd) {
          onAdd(data);
        }
        reset();
      }
      return { data, isValid };
    }, [validate, __validateFields, submit, onAdd, reset]);

    const handleDeleteClick = useCallback(() => {
      if (defaultValue?.key && onDelete) {
        onDelete(defaultValue.key);
      }
    }, [defaultValue, onDelete]);

    useImperativeHandle(
      ref,
      () => ({
        validate: async () => {
          if (!editForm && deepEqual(formData, FORM_DEFAULT_VALUE)) {
            return { data: {}, isValid: true };
          }

          __validateFields(['value.field']);
          const isValid = await validate();

          return { data: formData?.key?.length ? { [formData.key]: formData.value } : {}, isValid };
        },
      }),
      [__validateFields, editForm, formData, validate]
    );

    useEffect(() => {
      if (onChange && !deepEqual(formData, currentFormData.current)) {
        currentFormData.current = formData;
        onChange(formData);
      }
    }, [defaultValue, formData, onChange]);

    useEffect(() => {
      if (defaultValue) {
        validate();
        __validateFields(['value.field']);
      }
    }, [defaultValue, osquerySchemaOptions, validate, __validateFields]);

    return (
      <Form form={form}>
        <EuiFlexGroup alignItems="flexStart">
          <EuiFlexItem>
            <CommonUseField
              path="value.field"
              component={OsqueryColumnField}
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              euiFieldProps={{
                label: 'Osquery result',
                options: osquerySchemaOptions,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart">
              <EuiFlexItem grow={false}>
                <StyledButtonWrapper>
                  <EuiIcon type="arrowRight" />
                </StyledButtonWrapper>
              </EuiFlexItem>
              <EuiFlexItem>
                <CommonUseField path="key" component={ECSComboboxField} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <StyledButtonWrapper>
                  {defaultValue ? (
                    <EuiButtonIcon
                      aria-label={i18n.translate(
                        'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.deleteECSMappingRowButtonAriaLabel',
                        {
                          defaultMessage: 'Delete ECS mapping row',
                        }
                      )}
                      iconType="trash"
                      color="danger"
                      onClick={handleDeleteClick}
                    />
                  ) : (
                    <EuiButtonIcon
                      aria-label={i18n.translate(
                        'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.addECSMappingRowButtonAriaLabel',
                        {
                          defaultMessage: 'Add ECS mapping row',
                        }
                      )}
                      iconType="plus"
                      color="primary"
                      onClick={handleSubmit}
                    />
                  )}
                </StyledButtonWrapper>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </Form>
    );
  }
);

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

export const ECSMappingEditorField = ({ field, query, fieldRef }: ECSMappingEditorFieldProps) => {
  const { setValue, value = {} } = field;
  const [osquerySchemaOptions, setOsquerySchemaOptions] = useState<OsquerySchemaOption[]>([]);
  const formRefs = useRef<Record<string, ECSMappingEditorFormRef>>({});

  useImperativeHandle(
    fieldRef,
    () => ({
      validate: async () => {
        const validations = await Promise.all(
          Object.values(formRefs.current).map(async (formRef) => {
            const { data, isValid } = await formRef.validate();
            return [data, isValid];
          })
        );

        if (find(validations, (result) => result[1] === false)) {
          return false;
        }

        return deepmerge.all(map(validations, '[0]'));
      },
    }),
    []
  );

  useEffect(() => {
    setOsquerySchemaOptions((currentValue) => {
      if (!query?.length) {
        return currentValue;
      }

      const parser = new Parser();
      let ast: Select;

      try {
        const parsedQuery = parser.astify(query);
        ast = (isArray(parsedQuery) ? parsedQuery[0] : parsedQuery) as Select;
      } catch (e) {
        return currentValue;
      }

      const astOsqueryTables: Record<string, OsqueryColumn[]> = ast?.from?.reduce((acc, table) => {
        const osqueryTable = find(osquerySchema, ['name', table.table]);

        if (osqueryTable) {
          acc[table.as ?? table.table] = osqueryTable.columns;
        }

        return acc;
      }, {});

      // Table doesn't exist in osquery schema
      if (
        !isArray(ast?.columns) &&
        ast?.columns !== '*' &&
        !astOsqueryTables[ast?.from && ast?.from[0].table]
      ) {
        return currentValue;
      }
      /*
        Simple query
        select * from users;
      */
      if (ast?.columns === '*' && ast.from?.length && astOsqueryTables[ast.from[0].table]) {
        const tableName = ast.from[0].as ?? ast.from[0].table;

        return astOsqueryTables[ast.from[0].table].map((osqueryColumn) => ({
          label: osqueryColumn.name,
          value: {
            name: osqueryColumn.name,
            description: osqueryColumn.description,
            table: tableName,
            suggestion_label: osqueryColumn.name,
          },
        }));
      }

      /*
       Advanced query
       select i.*, p.resident_size, p.user_time, p.system_time, time.minutes as counter from osquery_info i, processes p, time where p.pid = i.pid;
      */
      const suggestions =
        isArray(ast?.columns) &&
        ast?.columns
          ?.map((column) => {
            if (column.expr.column === '*') {
              return astOsqueryTables[column.expr.table].map((osqueryColumn) => ({
                label: osqueryColumn.name,
                value: {
                  name: osqueryColumn.name,
                  description: osqueryColumn.description,
                  table: column.expr.table,
                  suggestion_label: `${osqueryColumn.name}`,
                },
              }));
            }

            if (astOsqueryTables && astOsqueryTables[column.expr.table]) {
              const osqueryColumn = find(astOsqueryTables[column.expr.table], [
                'name',
                column.expr.column,
              ]);

              if (osqueryColumn) {
                const label = column.as ?? column.expr.column;

                return [
                  {
                    label: column.as ?? column.expr.column,
                    value: {
                      name: osqueryColumn.name,
                      description: osqueryColumn.description,
                      table: column.expr.table,
                      suggestion_label: `${label}`,
                    },
                  },
                ];
              }
            }

            return [];
          })
          .flat();

      //  @ts-expect-error update types
      return sortBy(suggestions, 'value.suggestion_label');
    });
  }, [query]);

  const handleAddRow = useCallback(
    (newRow) => {
      if (newRow?.key && newRow?.value) {
        setValue(
          produce((draft) => {
            draft[newRow.key] = newRow.value;
            return draft;
          })
        );
      }
    },
    [setValue]
  );

  const handleUpdateRow = useCallback(
    (currentKey: string) => (updatedRow: FormData) => {
      if (updatedRow?.key && updatedRow?.value) {
        setValue(
          produce((draft) => {
            if (currentKey !== updatedRow.key) {
              delete draft[currentKey];
            }

            draft[updatedRow.key] = updatedRow.value;

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
          // eslint-disable-next-line
          ref={(formRef) => {
            if (formRef) {
              formRefs.current[ecsKey] = formRef;
            }
          }}
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
      <ECSMappingEditorForm
        // eslint-disable-next-line
        ref={(formRef) => {
          if (formRef) {
            formRefs.current.new = formRef;
          }
        }}
        osquerySchemaOptions={osquerySchemaOptions}
        onAdd={handleAddRow}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default ECSMappingEditorField;
