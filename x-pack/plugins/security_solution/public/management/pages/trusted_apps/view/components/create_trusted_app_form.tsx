/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEventHandler, memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiFormProps } from '@elastic/eui/src/components/form/form';
import {
  ConditionEntryField,
  MacosLinuxConditionEntry,
  NewTrustedApp,
  OperatingSystem,
} from '../../../../../../common/endpoint/types';
import { isValidHash } from '../../../../../../common/endpoint/validation/trusted_apps';

import {
  isMacosLinuxTrustedAppCondition,
  isWindowsTrustedAppCondition,
} from '../../state/type_guards';
import { defaultConditionEntry, defaultNewTrustedApp } from '../../store/builders';
import { OS_TITLES } from '../translations';
import { LogicalConditionBuilder, LogicalConditionBuilderProps } from './logical_condition';

const OPERATING_SYSTEMS: readonly OperatingSystem[] = [
  OperatingSystem.MAC,
  OperatingSystem.WINDOWS,
  OperatingSystem.LINUX,
];

interface FieldValidationState {
  /** If this fields state is invalid. Drives display of errors on the UI */
  isInvalid: boolean;
  errors: string[];
  warnings: string[];
}
interface ValidationResult {
  /** Overall indicator if form is valid */
  isValid: boolean;

  /** Individual form field validations */
  result: Partial<
    {
      [key in keyof NewTrustedApp]: FieldValidationState;
    }
  >;
}

const addResultToValidation = (
  validation: ValidationResult,
  field: keyof NewTrustedApp,
  type: 'warnings' | 'errors',
  resultValue: string
) => {
  if (!validation.result[field]) {
    validation.result[field] = {
      isInvalid: false,
      errors: [],
      warnings: [],
    };
  }
  validation.result[field]![type].push(resultValue);
  validation.result[field]!.isInvalid = true;
};

const validateFormValues = (values: NewTrustedApp): ValidationResult => {
  let isValid: ValidationResult['isValid'] = true;
  const validation: ValidationResult = {
    isValid,
    result: {},
  };

  // Name field
  if (!values.name.trim()) {
    isValid = false;
    addResultToValidation(
      validation,
      'name',
      'errors',
      i18n.translate('xpack.securitySolution.trustedapps.create.nameRequiredMsg', {
        defaultMessage: 'Name is required',
      })
    );
  }

  if (!values.os) {
    isValid = false;
    addResultToValidation(
      validation,
      'os',
      'errors',
      i18n.translate('xpack.securitySolution.trustedapps.create.osRequiredMsg', {
        defaultMessage: 'Operating System is required',
      })
    );
  }

  if (!values.entries.length) {
    isValid = false;
    addResultToValidation(
      validation,
      'entries',
      'errors',
      i18n.translate('xpack.securitySolution.trustedapps.create.conditionRequiredMsg', {
        defaultMessage: 'At least one Field definition is required',
      })
    );
  } else {
    values.entries.forEach((entry, index) => {
      if (!entry.field || !entry.value.trim()) {
        isValid = false;
        addResultToValidation(
          validation,
          'entries',
          'errors',
          i18n.translate(
            'xpack.securitySolution.trustedapps.create.conditionFieldValueRequiredMsg',
            {
              defaultMessage: '[{row}] Field entry must have a value',
              values: { row: index + 1 },
            }
          )
        );
      } else if (entry.field === ConditionEntryField.HASH && !isValidHash(entry.value)) {
        isValid = false;
        addResultToValidation(
          validation,
          'entries',
          'errors',
          i18n.translate('xpack.securitySolution.trustedapps.create.conditionFieldInvalidHashMsg', {
            defaultMessage: '[{row}] Invalid hash value',
            values: { row: index + 1 },
          })
        );
      }
    });
  }

  validation.isValid = isValid;
  return validation;
};

export interface TrustedAppFormState {
  isValid: boolean;
  item: NewTrustedApp;
}

export type CreateTrustedAppFormProps = Pick<
  EuiFormProps,
  'className' | 'data-test-subj' | 'isInvalid' | 'error' | 'invalidCallout'
> & {
  /** if form should be shown full width of parent container */
  fullWidth?: boolean;
  onChange: (state: TrustedAppFormState) => void;
};
export const CreateTrustedAppForm = memo<CreateTrustedAppFormProps>(
  ({ fullWidth, onChange, ...formProps }) => {
    const dataTestSubj = formProps['data-test-subj'];

    const osOptions: Array<EuiSuperSelectOption<OperatingSystem>> = useMemo(
      () => OPERATING_SYSTEMS.map((os) => ({ value: os, inputDisplay: OS_TITLES[os] })),
      []
    );

    const [formValues, setFormValues] = useState<NewTrustedApp>(defaultNewTrustedApp());

    const [validationResult, setValidationResult] = useState<ValidationResult>(() =>
      validateFormValues(formValues)
    );

    const [wasVisited, setWasVisited] = useState<
      Partial<
        {
          [key in keyof NewTrustedApp]: boolean;
        }
      >
    >({});

    const getTestId = useCallback(
      (suffix: string): string | undefined => {
        if (dataTestSubj) {
          return `${dataTestSubj}-${suffix}`;
        }
      },
      [dataTestSubj]
    );

    const handleAndClick = useCallback(() => {
      setFormValues(
        (prevState): NewTrustedApp => {
          if (prevState.os === OperatingSystem.WINDOWS) {
            return {
              ...prevState,
              entries: [...prevState.entries, defaultConditionEntry()].filter(
                isWindowsTrustedAppCondition
              ),
            };
          } else {
            return {
              ...prevState,
              entries: [
                ...prevState.entries.filter(isMacosLinuxTrustedAppCondition),
                defaultConditionEntry(),
              ],
            };
          }
        }
      );
    }, [setFormValues]);

    const handleDomChangeEvents = useCallback<
      ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
    >(({ target: { name, value } }) => {
      setFormValues(
        (prevState): NewTrustedApp => {
          return {
            ...prevState,
            [name]: value,
          };
        }
      );
    }, []);

    const handleDomBlurEvents = useCallback<ChangeEventHandler<HTMLInputElement>>(
      ({ target: { name } }) => {
        setWasVisited((prevState) => {
          return {
            ...prevState,
            [name]: true,
          };
        });
      },
      []
    );

    const handleOsChange = useCallback<(v: OperatingSystem) => void>((newOsValue) => {
      setFormValues(
        (prevState): NewTrustedApp => {
          const updatedState: NewTrustedApp = {
            ...prevState,
            entries: [],
            os: newOsValue,
          };
          if (updatedState.os !== OperatingSystem.WINDOWS) {
            updatedState.entries.push(
              ...(prevState.entries.filter((entry) =>
                isMacosLinuxTrustedAppCondition(entry)
              ) as MacosLinuxConditionEntry[])
            );
            if (updatedState.entries.length === 0) {
              updatedState.entries.push(defaultConditionEntry());
            }
          } else {
            updatedState.entries.push(...prevState.entries);
          }
          return updatedState;
        }
      );
      setWasVisited((prevState) => {
        return {
          ...prevState,
          os: true,
        };
      });
    }, []);

    const handleEntryRemove = useCallback((entry: NewTrustedApp['entries'][0]) => {
      setFormValues(
        (prevState): NewTrustedApp => {
          return {
            ...prevState,
            entries: prevState.entries.filter((item) => item !== entry),
          } as NewTrustedApp;
        }
      );
    }, []);

    const handleEntryChange = useCallback<LogicalConditionBuilderProps['onEntryChange']>(
      (newEntry, oldEntry) => {
        setFormValues(
          (prevState): NewTrustedApp => {
            if (prevState.os === OperatingSystem.WINDOWS) {
              return {
                ...prevState,
                entries: prevState.entries.map((item) => {
                  if (item === oldEntry) {
                    return newEntry;
                  }
                  return item;
                }),
              } as NewTrustedApp;
            } else {
              return {
                ...prevState,
                entries: prevState.entries.map((item) => {
                  if (item === oldEntry) {
                    return newEntry;
                  }
                  return item;
                }),
              } as NewTrustedApp;
            }
          }
        );
      },
      []
    );

    const handleConditionBuilderOnVisited: LogicalConditionBuilderProps['onVisited'] = useCallback(() => {
      setWasVisited((prevState) => {
        return {
          ...prevState,
          entries: true,
        };
      });
    }, []);

    // Anytime the form values change, re-validate
    useEffect(() => {
      setValidationResult(validateFormValues(formValues));
    }, [formValues]);

    // Anytime the form values change - validate and notify
    useEffect(() => {
      onChange({
        isValid: validationResult.isValid,
        item: formValues,
      });
    }, [formValues, onChange, validationResult.isValid]);

    return (
      <EuiForm {...formProps} component="div">
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.trustedapps.create.name', {
            defaultMessage: 'Name your trusted application',
          })}
          fullWidth={fullWidth}
          data-test-subj={getTestId('nameRow')}
          isInvalid={wasVisited?.name && validationResult.result.name?.isInvalid}
          error={validationResult.result.name?.errors}
        >
          <EuiFieldText
            name="name"
            value={formValues.name}
            onChange={handleDomChangeEvents}
            onBlur={handleDomBlurEvents}
            fullWidth
            required
            maxLength={256}
            data-test-subj={getTestId('nameTextField')}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.trustedapps.create.os', {
            defaultMessage: 'Select operating system',
          })}
          fullWidth={fullWidth}
          data-test-subj={getTestId('OsRow')}
          isInvalid={wasVisited?.os && validationResult.result.os?.isInvalid}
          error={validationResult.result.os?.errors}
        >
          <EuiSuperSelect
            name="os"
            options={osOptions}
            valueOfSelected={formValues.os}
            onChange={handleOsChange}
            fullWidth
            data-test-subj={getTestId('osSelectField')}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth={fullWidth}
          data-test-subj={getTestId('conditionsRow')}
          isInvalid={wasVisited?.entries && validationResult.result.entries?.isInvalid}
          error={validationResult.result.entries?.errors}
        >
          <LogicalConditionBuilder
            entries={formValues.entries}
            os={formValues.os}
            onAndClicked={handleAndClick}
            onEntryRemove={handleEntryRemove}
            onEntryChange={handleEntryChange}
            onVisited={handleConditionBuilderOnVisited}
            data-test-subj={getTestId('conditionsBuilder')}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.trustedapps.create.description', {
            defaultMessage: 'Description',
          })}
          fullWidth={fullWidth}
          data-test-subj={getTestId('descriptionRow')}
        >
          <EuiTextArea
            name="description"
            value={formValues.description}
            onChange={handleDomChangeEvents}
            fullWidth
            maxLength={256}
            data-test-subj={getTestId('descriptionField')}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
);

CreateTrustedAppForm.displayName = 'NewTrustedAppForm';
