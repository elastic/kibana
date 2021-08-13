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

import ECSSchema from '../../common/schemas/ecs/v1.10.0.json';
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

  const singleSelection = useMemo(() => ({ asPlainText: true }), []);

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
        isClearable={false}
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
  const { setValue } = field;
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
  osquerySchemaOptions: OsquerySchemaOption[];
  defaultValue?: FormData;
  onAdd?: (payload: FormData) => void;
  onChange?: (payload: FormData) => void;
  onDelete?: (key: string) => void;
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
      label: i18n.translate('xpack.osquery.scheduledQueryGroup.queryFlyoutForm.ecsFieldLabel', {
        defaultMessage: 'ECS field',
      }),
      type: FIELD_TYPES.COMBO_BOX,
      validations: [
        {
          validator: fieldValidators.emptyField(
            i18n.translate(
              'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.ecsFieldRequiredErrorMessage',
              {
                defaultMessage: 'ECS field is required.',
              }
            )
          ),
        },
      ],
    },
    'value.field': {
      label: i18n.translate(
        'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.osqueryColumnFieldLabel',
        {
          defaultMessage: 'Osquery results column',
        }
      ),
      type: FIELD_TYPES.COMBO_BOX,
      validations: [
        {
          validator: fieldValidators.emptyField(
            i18n.translate(
              'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.osqueryColumnFieldRequiredErrorMessage',
              {
                defaultMessage: 'Osquery column is required.',
              }
            )
          ),
        },
      ],
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
      if (onAdd) {
        onAdd(data);
      }
      reset();
    }
  }, [submit, onAdd, reset]);

  useEffect(() => {
    if (defaultValue && onChange && !deepEqual(formData, currentFormData.current)) {
      currentFormData.current = formData;
      onChange(formData);
    }
  }, [defaultValue, formData, onChange]);

  const handleDeleteClick = useCallback(() => {
    if (defaultValue?.key && onDelete) {
      onDelete(defaultValue.key);
    }
  }, [defaultValue, onDelete]);

  return (
    <Form form={form}>
      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem>
          <CommonUseField
            path="value.field"
            component={OsqueryColumnField}
            // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
            euiFieldProps={{
              label: 'Osquery results column',
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
                  <EuiButtonIcon iconType="trash" color="danger" onClick={handleDeleteClick} />
                ) : (
                  <EuiButtonIcon iconType="plus" color="primary" onClick={handleSubmit} />
                )}
              </StyledButtonWrapper>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </Form>
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

export const ECSMappingEditorField = ({ field, query }: Props) => {
  const { setValue, value } = field;
  const [osquerySchemaOptions, setOsquerySchemaOptions] = useState<OsquerySchemaOption[]>([]);

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
      console.error('ast?.columns', ast?.columns, typeof ast?.columns);
      const suggestions =
        isArray(ast?.columns) &&
        ast?.columns
          // @ts-expect-error update types
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
