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
import { NewTrustedApp } from '../../../../../../common/endpoint/types';
import { LogicalConditionBuilderProps } from './logical_condition/logical_condition_builder';

const generateNewEntry = (): NewTrustedApp['entries'][0] => {
  return {
    field: 'process.hash.*',
    operator: 'included',
    type: 'match',
    value: '',
  };
};

const validateFormValues = (values: NewTrustedApp) => {
  const errors = {};

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
export type CreateTrustedAppFormProps = EuiFormProps & {
  /** if form should be shown full width of parent container */
  fullWidth?: boolean;
  onChange: (state: TrustedAppFormState) => void;
};
export const CreateTrustedAppForm = memo<CreateTrustedAppFormProps>(
  ({ fullWidth, onChange, ...formProps }) => {
    const osOptions: Array<EuiSuperSelectOption<string>> = useMemo(() => {
      // FIXME:PT i18n these or get them from an already i18n place (see Bohdan's PR after merge)
      return TRUSTED_APPS_SUPPORTED_OS_TYPES.map((os) => {
        return {
          value: os,
          inputDisplay: os,
        };
      });
    }, []);
    const [formValues, setFormValues] = useState<NewTrustedApp>({
      name: '',
      os: 'windows',
      entries: [generateNewEntry()],
      description: '',
    });
    const handleAndClick = useCallback(() => {
      setFormValues((prevState) => {
        return {
          ...prevState,
          entries: [...prevState.entries, generateNewEntry()],
        };
      });
    }, [setFormValues]);
    const handleDomChangeEvents = useCallback<
      ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
    >(({ target: { name, value } }) => {
      setFormValues((prevState) => {
        return {
          ...prevState,
          [name]: value,
        };
      });
    }, []);
    const handleOsChange = useCallback<(v: string) => void>((newOsValue) => {
      setFormValues((prevState) => {
        return {
          ...prevState,
          os: newOsValue as NewTrustedApp['os'],
        };
        // FIXME:PT need to adjust `entries` (potentially) based on OS being windows
      });
    }, []);
    const handleEntryRemove = useCallback((entry: NewTrustedApp['entries'][0]) => {
      setFormValues((prevState) => {
        return {
          ...prevState,
          entries: prevState.entries.filter((item) => item !== entry),
        };
      });
    }, []);
    const handleEntryChange = useCallback<LogicalConditionBuilderProps['onEntryChange']>(
      (newEntry, oldEntry) => {
        setFormValues((prevState) => {
          return {
            ...prevState,
            entries: prevState.entries.map((item) => {
              if (item === oldEntry) {
                return newEntry;
              }
              return item;
            }),
          };
        });
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
      <EuiForm {...formProps}>
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.trustedapps.create.name', {
            defaultMessage: 'Name your trusted app application',
          })}
          fullWidth={fullWidth}
        >
          <EuiFieldText
            name="name"
            value={formValues.name}
            onChange={handleDomChangeEvents}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.trustedapps.create.os', {
            defaultMessage: 'Select operating system',
          })}
          fullWidth={fullWidth}
        >
          <EuiSuperSelect
            name="os"
            options={osOptions}
            valueOfSelected={formValues.os}
            onChange={handleOsChange}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow fullWidth={fullWidth}>
          <LogicalConditionBuilder
            entries={formValues.entries}
            os={formValues.os}
            onAndClicked={handleAndClick}
            onEntryRemove={handleEntryRemove}
            onEntryChange={handleEntryChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.securitySolution.trustedapps.create.description', {
            defaultMessage: 'Description',
          })}
          fullWidth={fullWidth}
        >
          <EuiTextArea
            name="description"
            value={formValues.description}
            onChange={handleDomChangeEvents}
            fullWidth
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
);

CreateTrustedAppForm.displayName = 'NewTrustedAppForm';
