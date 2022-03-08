/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiCode,
  EuiFieldText,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';
import { DefaultEmail, DynamicSettings } from '../../../common/runtime_types';
import { SettingsFormProps } from '../../pages/settings';
import { certificateFormTranslations } from './translations';

export type PartialSettings = Partial<Omit<DynamicSettings, 'defaultEmail'>> & {
  defaultEmail?: Partial<DefaultEmail>;
};

export type OnFieldChangeType = (changedValues: PartialSettings) => void;

export const CertificateExpirationForm: React.FC<SettingsFormProps> = ({
  loading,
  onChange,
  formFields,
  fieldErrors,
  isDisabled,
}) => (
  <>
    <EuiTitle size="s">
      <h3>
        <FormattedMessage
          id="xpack.uptime.sourceConfiguration.certificationSectionTitle"
          defaultMessage="Certificate Expiration"
        />
      </h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiDescribedFormGroup
      title={
        <h4>
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.expirationThreshold"
            defaultMessage="Expiration/Age Thresholds"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.uptime.sourceConfiguration.certificateThresholdDescription"
          defaultMessage="Change the threshold for displaying and alerting on certificate errors. Note: this will affect any configured alerts."
        />
      }
    >
      <EuiFormRow
        describedByIds={['errorState']}
        error={fieldErrors?.expirationThresholdError}
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.expirationThresholdDefaultValue"
            defaultMessage="The default value is {defaultValue}"
            values={{
              defaultValue: <EuiCode>{DYNAMIC_SETTINGS_DEFAULTS.certExpirationThreshold}</EuiCode>,
            }}
          />
        }
        isInvalid={!!fieldErrors?.expirationThresholdError}
        label={
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.errorStateLabel"
            defaultMessage="Expiration threshold"
          />
        }
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={2}>
            <EuiFieldText
              aria-label={certificateFormTranslations.expirationInputAriaLabel}
              data-test-subj={`expiration-threshold-input-${loading ? 'loading' : 'loaded'}`}
              fullWidth
              disabled={isDisabled}
              isInvalid={!!fieldErrors?.expirationThresholdError}
              isLoading={loading}
              value={formFields?.certExpirationThreshold ?? ''}
              onChange={(e) =>
                onChange({
                  certExpirationThreshold: Number(e.target.value) || undefined,
                })
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiText>
              <FormattedMessage
                id="xpack.uptime.sourceConfiguration.ageLimit.units.days"
                defaultMessage="Days"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiFormRow
        describedByIds={['warningState']}
        error={fieldErrors?.ageThresholdError}
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.ageThresholdDefaultValue"
            defaultMessage="The default value is {defaultValue}"
            values={{
              defaultValue: <EuiCode>{DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold}</EuiCode>,
            }}
          />
        }
        isInvalid={!!fieldErrors?.ageThresholdError}
        label={
          <FormattedMessage
            id="xpack.uptime.sourceConfiguration.warningStateLabel"
            defaultMessage="Age limit"
          />
        }
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={2}>
            <EuiFieldText
              aria-label={certificateFormTranslations.ageInputAriaLabel}
              data-test-subj={`age-threshold-input-${loading ? 'loading' : 'loaded'}`}
              fullWidth
              disabled={isDisabled}
              isInvalid={!!fieldErrors?.ageThresholdError}
              isLoading={loading}
              value={formFields?.certAgeThreshold ?? ''}
              onChange={({ target: { value } }) =>
                onChange({
                  certAgeThreshold: Number(value) || undefined,
                })
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiText>
              <FormattedMessage
                id="xpack.uptime.sourceConfiguration.ageLimit.units.days"
                defaultMessage="Days"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  </>
);
