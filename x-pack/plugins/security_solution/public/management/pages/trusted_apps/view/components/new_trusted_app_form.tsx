/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  ChangeEventHandler,
  memo,
  ReactEventHandler,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiSuperSelectProps } from '@elastic/eui/src/components/form/super_select/super_select';
import { TRUSTED_APPS_SUPPORTED_OS_TYPES } from '../../../../../../common/endpoint/constants';
import { LogicalConditionBuilder } from './logical_condition';
import { NewTrustedApp } from '../../../../../../common/endpoint/types';

export const NewTrustedAppForm = memo(() => {
  const handleAndClick = useCallback(() => {}, []);
  const osOptions: Array<EuiSuperSelectOption<string>> = useMemo(() => {
    // FIXME:PT i18n these or get them from an already i18n place
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
    entries: [],
    description: '',
  });
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

  return (
    <EuiForm>
      <EuiFormRow
        label={i18n.translate('xpack.securitySolution.trustedapps.create.name', {
          defaultMessage: 'Name your trusted app application',
        })}
      >
        <EuiFieldText name="name" value={formValues.name} onChange={handleDomChangeEvents} />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.securitySolution.trustedapps.create.os', {
          defaultMessage: 'Select operating system',
        })}
      >
        <EuiSuperSelect
          name="os"
          options={osOptions}
          valueOfSelected={formValues.os}
          onChange={handleOsChange}
        />
      </EuiFormRow>
      <EuiFormRow>
        <LogicalConditionBuilder
          entries={formValues.entries}
          os={formValues.os}
          onAndClicked={handleAndClick}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.securitySolution.trustedapps.create.description', {
          defaultMessage: 'Description',
        })}
      >
        <EuiTextArea
          name="description"
          value={formValues.description}
          onChange={handleDomChangeEvents}
        />
      </EuiFormRow>
    </EuiForm>
  );
});

NewTrustedAppForm.displayName = 'NewTrustedAppForm';
