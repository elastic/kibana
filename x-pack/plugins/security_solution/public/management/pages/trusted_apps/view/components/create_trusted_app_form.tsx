/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEventHandler, memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiFormProps } from '@elastic/eui/src/components/form/form';
import { TRUSTED_APPS_SUPPORTED_OS_TYPES } from '../../../../../../common/endpoint/constants';
import { LogicalConditionBuilder } from './logical_condition';
import {
  MacosLinuxConditionEntry,
  NewTrustedApp,
  TrustedApp,
} from '../../../../../../common/endpoint/types';
import { LogicalConditionBuilderProps } from './logical_condition/logical_condition_builder';
import { OS_TITLES } from '../constants';
import {
  isMacosLinuxTrustedAppCondition,
  isTrustedAppSupportedOs,
  isWindowsTrustedApp,
  isWindowsTrustedAppCondition,
} from '../../state/type_guards';

const generateNewEntry = (): NewTrustedApp['entries'][0] => {
  return {
    field: 'process.hash.*',
    operator: 'included',
    type: 'match',
    value: '',
  };
};

interface ValidationResult {
  isValid: boolean;
  errors: Partial<{ [k in keyof NewTrustedApp]: string }>;
}
const validateFormValues = (values: NewTrustedApp): ValidationResult => {
  const errors: ValidationResult['errors'] = {};

  if (!values.name.trim()) {
    errors.name = 'Name is required';
  }

  if (!values.os) {
    errors.os = 'OS is required';
  }

  if (!values.entries.length) {
    errors.entries = 'At least one Field definition is required';
  } else {
    values.entries.some((entry, index) => {
      if (!entry.field || !entry.value.trim()) {
        errors.entries = `Field entry ${index + 1} must have a value`;
        return true;
      }
      return false;
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
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
    const osOptions: Array<EuiSuperSelectOption<string>> = useMemo(() => {
      return TRUSTED_APPS_SUPPORTED_OS_TYPES.map((os) => {
        return {
          value: os,
          inputDisplay: OS_TITLES[os as TrustedApp['os']],
        };
      });
    }, []);
    const [formValues, setFormValues] = useState<NewTrustedApp>({
      name: '',
      os: 'windows',
      entries: [generateNewEntry()],
      description: '',
    });
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
          if (isWindowsTrustedApp(prevState)) {
            return {
              ...prevState,
              entries: [...prevState.entries, generateNewEntry()].filter((entry) =>
                isWindowsTrustedAppCondition(entry)
              ),
            };
          } else {
            return {
              ...prevState,
              entries: [
                ...prevState.entries.filter((entry) => isMacosLinuxTrustedAppCondition(entry)),
                generateNewEntry(),
              ] as MacosLinuxConditionEntry[],
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
    const handleOsChange = useCallback<(v: string) => void>((newOsValue) => {
      setFormValues(
        (prevState): NewTrustedApp => {
          if (isTrustedAppSupportedOs(newOsValue)) {
            const updatedState: NewTrustedApp = {
              ...prevState,
              entries: [],
              os: newOsValue,
            };
            if (!isWindowsTrustedApp(updatedState)) {
              updatedState.entries.push(
                ...(prevState.entries.filter((entry) =>
                  isMacosLinuxTrustedAppCondition(entry)
                ) as MacosLinuxConditionEntry[])
              );
              if (updatedState.entries.length === 0) {
                updatedState.entries.push(generateNewEntry() as MacosLinuxConditionEntry);
              }
            } else {
              updatedState.entries.push(...prevState.entries);
            }
            return updatedState;
          }
          return prevState;
        }
      );
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
            if (isWindowsTrustedApp(prevState)) {
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

    // Anytime the form values change - validate and notify
    useEffect(() => {
      onChange({
        isValid: validateFormValues(formValues).isValid,
        item: formValues,
      });
    }, [formValues, onChange]);

    return (
      <EuiForm {...formProps} component="div">
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.trustedapps.create.name', {
            defaultMessage: 'Name your trusted app application',
          })}
          fullWidth={fullWidth}
          data-test-subj={getTestId('nameRow')}
        >
          <EuiFieldText
            name="name"
            value={formValues.name}
            onChange={handleDomChangeEvents}
            fullWidth
            data-test-subj={getTestId('nameTextField')}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.trustedapps.create.os', {
            defaultMessage: 'Select operating system',
          })}
          fullWidth={fullWidth}
          data-test-subj={getTestId('OsRow')}
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
        <EuiFormRow fullWidth={fullWidth} data-test-subj={getTestId('conditionsRow')}>
          <LogicalConditionBuilder
            entries={formValues.entries}
            os={formValues.os}
            onAndClicked={handleAndClick}
            onEntryRemove={handleEntryRemove}
            onEntryChange={handleEntryChange}
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
            data-test-subj={getTestId('descriptionField')}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
);

CreateTrustedAppForm.displayName = 'NewTrustedAppForm';
