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
import { isEqual } from 'lodash';
import { Link } from 'react-router-dom';
import { selectDynamicSettings } from '../state/selectors';
import { getDynamicSettings, setDynamicSettings } from '../state/actions/dynamic_settings';
import { DynamicSettings } from '../../common/runtime_types';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { OVERVIEW_ROUTE } from '../../common/constants';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { UptimePage, useUptimeTelemetry } from '../hooks';
import { IndicesForm } from '../components/settings/indices_form';
import {
  CertificateExpirationForm,
  OnFieldChangeType,
} from '../components/settings/certificate_form';
import * as Translations from './translations';

interface SettingsPageFieldErrors {
  heartbeatIndices: 'May not be blank' | '';
  certificatesThresholds: {
    expirationThresholdError: string | null;
    ageThresholdError: string | null;
  } | null;
}

export interface SettingsFormProps {
  loading: boolean;
  onChange: OnFieldChangeType;
  formFields: DynamicSettings | null;
  fieldErrors: SettingsPageFieldErrors | null;
  isDisabled: boolean;
}

const getFieldErrors = (formFields: DynamicSettings | null): SettingsPageFieldErrors | null => {
  if (formFields) {
    const blankStr = 'May not be blank';
    const { certThresholds: certificatesThresholds, heartbeatIndices } = formFields;
    const heartbeatIndErr = heartbeatIndices.match(/^\S+$/) ? '' : blankStr;
    const expirationThresholdError = certificatesThresholds?.expiration ? null : blankStr;
    const ageThresholdError = certificatesThresholds?.age ? null : blankStr;
    return {
      heartbeatIndices: heartbeatIndErr,
      certificatesThresholds:
        expirationThresholdError || ageThresholdError
          ? {
              expirationThresholdError,
              ageThresholdError,
            }
          : null,
    };
  }
  return null;
};

export const SettingsPage = () => {
  const dss = useSelector(selectDynamicSettings);

  useBreadcrumbs([{ text: Translations.settings.breadcrumbText }]);

  useUptimeTelemetry(UptimePage.Settings);

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

  const isFormValid = !(fieldErrors && Object.values(fieldErrors).find(v => !!v));

  const onChangeFormField: OnFieldChangeType = changedField => {
    if (formFields) {
      setFormFields({
        heartbeatIndices: changedField.heartbeatIndices ?? formFields.heartbeatIndices,
        certThresholds: Object.assign(
          {},
          formFields.certThresholds,
          changedField?.certThresholds ?? null
        ),
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

  const isFormDirty = !isEqual(dss.settings, formFields);
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
      <Link to={OVERVIEW_ROUTE} data-test-subj="uptimeSettingsToOverviewLink">
        <EuiButtonEmpty size="s" color="primary" iconType="arrowLeft">
          {Translations.settings.returnToOverviewLinkLabel}
        </EuiButtonEmpty>
      </Link>
      <EuiSpacer size="s" />
      <EuiPanel>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>{cannotEditNotice}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <form onSubmit={onApply}>
              <EuiForm>
                <IndicesForm
                  loading={dss.loading}
                  onChange={onChangeFormField}
                  formFields={formFields}
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
                      type="submit"
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
            </form>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
