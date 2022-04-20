/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiForm, EuiSpacer } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { selectDynamicSettings } from '../state/selectors';
import { getDynamicSettings, setDynamicSettings } from '../state/actions/dynamic_settings';
import { DynamicSettings } from '../../common/runtime_types';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { IndicesForm } from '../components/settings/indices_form';
import {
  CertificateExpirationForm,
  OnFieldChangeType,
  PartialSettings,
} from '../components/settings/certificate_form';
import * as Translations from './translations';
import {
  VALUE_MUST_BE_GREATER_THAN_ZERO,
  VALUE_MUST_BE_AN_INTEGER,
} from '../../common/translations';
import { AlertDefaultsForm } from '../components/settings/alert_defaults_form';
import { SettingsActionBarPortal } from '../components/settings/settings_bottom_bar';
import { useSettingsErrors } from '../components/settings/use_settings_errors';

export interface SettingsPageFieldErrors {
  heartbeatIndices: string | '';
  expirationThresholdError?: string;
  ageThresholdError?: string;
  invalidEmail?: {
    to?: string;
    cc?: string;
    bcc?: string;
  };
}

export interface SettingsFormProps {
  loading: boolean;
  onChange: OnFieldChangeType;
  formFields: DynamicSettings | null;
  fieldErrors: SettingsPageFieldErrors | null;
  isDisabled: boolean;
}

export const isValidCertVal = (val?: number): string | undefined => {
  if (val === undefined || isNaN(val)) {
    return Translations.settings.mustBeNumber;
  }
  if (val <= 0) {
    return VALUE_MUST_BE_GREATER_THAN_ZERO;
  }
  if (val % 1) {
    return VALUE_MUST_BE_AN_INTEGER;
  }
};

export const SettingsPage: React.FC = () => {
  const dss = useSelector(selectDynamicSettings);

  useBreadcrumbs([{ text: Translations.settings.breadcrumbText }]);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getDynamicSettings());
  }, [dispatch]);

  const [formFields, setFormFields] = useState<PartialSettings | null>(
    dss.settings ? { ...dss.settings } : null
  );

  if (!dss.loadError && formFields === null && dss.settings) {
    setFormFields(Object.assign({}, { ...dss.settings }));
  }

  const { errors: fieldErrors, isFormDirty } = useSettingsErrors(formFields);

  const isFormValid = !(fieldErrors && Object.values(fieldErrors).find((v) => !!v));

  const onChangeFormField: OnFieldChangeType = useCallback(
    (changedField) => {
      if (formFields) {
        setFormFields({
          ...formFields,
          ...changedField,
        });
      }
    },
    [formFields]
  );

  const onApply = (event: React.FormEvent) => {
    event.preventDefault();
    if (formFields) {
      dispatch(setDynamicSettings(formFields as DynamicSettings));
    }
  };

  const resetForm = () => setFormFields(dss.settings ? { ...dss.settings } : null);

  const canEdit: boolean =
    !!useKibana().services?.application?.capabilities.uptime.configureSettings || false;
  const isFormDisabled = dss.loading || !canEdit;

  const cannotEditNotice = canEdit ? null : (
    <>
      <EuiCallOut title={Translations.settings.editNoticeTitle}>
        {Translations.settings.editNoticeText}
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>{cannotEditNotice}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <div id="settings-form">
            <EuiForm>
              <IndicesForm
                loading={dss.loading}
                onChange={onChangeFormField}
                formFields={formFields as DynamicSettings}
                fieldErrors={fieldErrors}
                isDisabled={isFormDisabled}
              />
              <AlertDefaultsForm
                loading={dss.loading}
                formFields={formFields as DynamicSettings}
                onChange={onChangeFormField}
                fieldErrors={fieldErrors}
                isDisabled={isFormDisabled}
              />
              <CertificateExpirationForm
                loading={dss.loading}
                onChange={onChangeFormField}
                formFields={formFields as DynamicSettings}
                fieldErrors={fieldErrors}
                isDisabled={isFormDisabled}
              />
            </EuiForm>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      <SettingsActionBarPortal
        onApply={onApply}
        isFormDirty={isFormDirty}
        isFormDisabled={isFormDisabled}
        isFormValid={isFormValid}
        onCancel={resetForm}
        errors={fieldErrors}
      />
    </>
  );
};
