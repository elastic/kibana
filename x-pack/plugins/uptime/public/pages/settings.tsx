/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch, useSelector } from 'react-redux';
import { selectDynamicSettings } from '../state/selectors';
import { getDynamicSettings, setDynamicSettings } from '../state/actions/dynamic_settings';
import { DynamicSettings } from '../../common/runtime_types';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { OVERVIEW_ROUTE } from '../../common/constants';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { IndicesForm } from '../components/settings/indices_form';
import {
  CertificateExpirationForm,
  OnFieldChangeType,
} from '../components/settings/certificate_form';
import * as Translations from './translations';
import {
  VALUE_MUST_BE_GREATER_THAN_ZERO,
  VALUE_MUST_BE_AN_INTEGER,
} from '../../common/translations';
import { ReactRouterEuiButtonEmpty } from '../components/common/react_router_helpers';
import { AlertDefaultsForm } from '../components/settings/alert_defaults_form';

interface SettingsPageFieldErrors {
  heartbeatIndices: string | '';
  expirationThresholdError?: string;
  ageThresholdError?: string;
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

const getFieldErrors = (formFields: DynamicSettings | null): SettingsPageFieldErrors | null => {
  if (formFields) {
    const { certAgeThreshold, certExpirationThreshold, heartbeatIndices } = formFields;

    const indError = heartbeatIndices.match(/^\S+$/) ? '' : Translations.BLANK_STR;

    const expError = isValidCertVal(certExpirationThreshold);
    const ageError = isValidCertVal(certAgeThreshold);

    return {
      heartbeatIndices: indError,
      expirationThresholdError: expError,
      ageThresholdError: ageError,
    };
  }
  return null;
};

const isDirtyForm = (formFields: DynamicSettings | null, settings?: DynamicSettings) => {
  return (
    settings?.certAgeThreshold !== formFields?.certAgeThreshold ||
    settings?.certExpirationThreshold !== formFields?.certExpirationThreshold ||
    settings?.heartbeatIndices !== formFields?.heartbeatIndices ||
    JSON.stringify(settings?.defaultConnectors) !== JSON.stringify(formFields?.defaultConnectors)
  );
};

export const SettingsPage: React.FC = () => {
  const dss = useSelector(selectDynamicSettings);

  useBreadcrumbs([{ text: Translations.settings.breadcrumbText }]);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getDynamicSettings());
  }, [dispatch]);

  const [formFields, setFormFields] = useState<DynamicSettings | null>(
    dss.settings ? { ...dss.settings } : null
  );

  if (!dss.loadError && formFields === null && dss.settings) {
    setFormFields(Object.assign({}, { ...dss.settings }));
  }

  const fieldErrors = getFieldErrors(formFields);

  const isFormValid = !(fieldErrors && Object.values(fieldErrors).find((v) => !!v));

  const onChangeFormField: OnFieldChangeType = (changedField) => {
    if (formFields) {
      setFormFields({
        ...formFields,
        ...changedField,
      });
    }
  };

  const onApply = (event: React.FormEvent) => {
    event.preventDefault();
    if (formFields) {
      dispatch(setDynamicSettings(formFields));
    }
  };

  const resetForm = () => setFormFields(dss.settings ? { ...dss.settings } : null);

  const isFormDirty = isDirtyForm(formFields, dss.settings);

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
      <ReactRouterEuiButtonEmpty
        color="primary"
        data-test-subj="uptimeSettingsToOverviewLink"
        iconType="arrowLeft"
        to={OVERVIEW_ROUTE}
        size="s"
      >
        {Translations.settings.returnToOverviewLinkLabel}
      </ReactRouterEuiButtonEmpty>
      <EuiSpacer size="s" />
      <EuiPanel>
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
                  formFields={formFields}
                  fieldErrors={fieldErrors}
                  isDisabled={isFormDisabled}
                />
                <AlertDefaultsForm
                  loading={dss.loading}
                  formFields={formFields}
                  onChange={onChangeFormField}
                  fieldErrors={fieldErrors}
                  isDisabled={isFormDisabled}
                />
                <CertificateExpirationForm
                  loading={dss.loading}
                  onChange={onChangeFormField}
                  formFields={formFields}
                  fieldErrors={fieldErrors}
                  isDisabled={isFormDisabled}
                />

                <EuiSpacer size="m" />
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="discardSettingsButton"
                      isDisabled={!isFormDirty || isFormDisabled}
                      onClick={() => {
                        resetForm();
                      }}
                    >
                      <FormattedMessage
                        id="xpack.uptime.sourceConfiguration.discardSettingsButtonLabel"
                        defaultMessage="Cancel"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="apply-settings-button"
                      onClick={onApply}
                      color="primary"
                      isDisabled={!isFormDirty || !isFormValid || isFormDisabled}
                      fill
                    >
                      <FormattedMessage
                        id="xpack.uptime.sourceConfiguration.applySettingsButtonLabel"
                        defaultMessage="Apply changes"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiForm>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
