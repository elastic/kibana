/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { IntegrationConfigurationFormProps } from '@kbn/wci-browser';
import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFieldPassword,
  EuiFormRow,
  EuiSpacer,
  EuiComboBox,
  EuiText,
  EuiCallOut,
  EuiComboBoxOptionOption,
  EuiLink,
  EuiIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { Controller, useWatch } from 'react-hook-form';
import { useSalesforceCredentials } from '../hooks/use_salesforce_credentials';
import { useSalesforceObjects } from '../hooks/use_salesforce_objects';

export const SalesforceConfigurationForm: React.FC<IntegrationConfigurationFormProps> = ({
  form,
}) => {
  const { control } = form;
  const [isValidated, setIsValidated] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedStandardObjects, setSelectedStandardObjects] = useState<EuiComboBoxOptionOption[]>(
    []
  );
  const [selectedCustomObjects, setSelectedCustomObjects] = useState<EuiComboBoxOptionOption[]>([]);
  const checkCredentials = useSalesforceCredentials();
  const { mutate: pingSalesforce } = checkCredentials;

  // Watch all credential fields
  const domain = useWatch({
    control,
    name: 'configuration.domain',
  });
  const clientId = useWatch({
    control,
    name: 'configuration.clientId',
  });
  const clientSecret = useWatch({
    control,
    name: 'configuration.clientSecret',
  });

  // Prepare credentials object for the objects query
  const credentials =
    domain && clientId && clientSecret ? { domain, clientId, clientSecret } : null;

  // Fetch available objects when credentials are valid
  const { data: objectsData, isLoading: isLoadingObjects } = useSalesforceObjects(
    isValidated ? credentials : null
  );

  useEffect(() => {
    const validateCredentials = async () => {
      // Only proceed if all fields are filled
      if (domain && clientId && clientSecret) {
        pingSalesforce({
          domain,
          clientId,
          clientSecret,
        });
      } else {
        setIsValidated(false);
        setValidationError(null);
      }
    };

    // Only set up the debounce timer if all fields are filled
    if (domain && clientId && clientSecret) {
      const debounceTimer = setTimeout(validateCredentials, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [domain, clientId, clientSecret, pingSalesforce]);

  // Handle validation state changes
  useEffect(() => {
    if (checkCredentials.isSuccess) {
      setIsValidated(true);
      setValidationError(null);
    } else if (checkCredentials.isError) {
      setIsValidated(false);
      setValidationError(checkCredentials.error.message);
    }
  }, [checkCredentials.isSuccess, checkCredentials.isError, checkCredentials.error]);

  const getValidationStatus = () => {
    if (!domain || !clientId || !clientSecret) return null;
    if (checkCredentials.isLoading) return 'validating';
    if (isValidated) return 'valid';
    if (validationError) return 'invalid';
    return null;
  };

  const renderValidationStatus = () => {
    const status = getValidationStatus();
    if (!status) return <></>;

    const statusConfig = {
      valid: { icon: 'check', color: 'success', text: 'Credentials valid' },
      invalid: { icon: 'error', color: 'danger', text: 'Invalid credentials' },
    };

    if (status === 'validating') {
      return <EuiLoadingSpinner size="s" />;
    }

    const config = statusConfig[status];

    return (
      <EuiText size="s" color={config.color}>
        <EuiIcon type={config.icon} /> {config.text}
      </EuiText>
    );
  };

  return (
    <>
      <EuiDescribedFormGroup
        ratio="third"
        title={<h3>Salesforce Configuration</h3>}
        description={
          <p>
            Salesforce credentials to access your data. See{' '}
            <EuiLink href="#">
              <strong>documentation</strong>
            </EuiLink>{' '}
            for guidance on required permissions.
          </p>
        }
      >
        <EuiFormRow
          label="Salesforce Domain"
          helpText="If your Salesforce URL is https://foo.salesforce.com, your domain is 'foo'"
        >
          <Controller
            name="configuration.domain"
            control={control}
            render={({ field }) => (
              <EuiFieldText
                data-test-subj="workchatSalesforceToolDomain"
                placeholder="Enter your Salesforce domain"
                {...field}
              />
            )}
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiFormRow label="Client ID" helpText="Your Salesforce Connected App's Client ID">
          <Controller
            name="configuration.clientId"
            control={control}
            render={({ field }) => (
              <EuiFieldPassword
                data-test-subj="workchatSalesforceToolClientId"
                placeholder="Enter your Client ID"
                type="dual"
                {...field}
              />
            )}
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiFormRow label="Client Secret">
          <Controller
            name="configuration.clientSecret"
            control={control}
            render={({ field }) => (
              <EuiFieldPassword
                data-test-subj="workchatSalesforceToolClientSecret"
                placeholder="Enter Salesforce Client Secret"
                type="dual"
                {...field}
              />
            )}
          />
        </EuiFormRow>
        <EuiFormRow>{renderValidationStatus()}</EuiFormRow>
      </EuiDescribedFormGroup>

      {validationError && (
        <EuiCallOut title="Validation Error" color="danger" iconType="error">
          <p>{validationError}</p>
        </EuiCallOut>
      )}

      {isValidated && (
        <>
          <EuiSpacer size="l" />
          <EuiDescribedFormGroup
            ratio="third"
            title={<h3>Sync Configuration</h3>}
            description="Configure which objects to sync with Elasticsearch"
          >
            <EuiFormRow label="Standard Objects">
              <EuiComboBox
                placeholder="Select standard objects to sync"
                options={objectsData?.standard.map((name) => ({ label: name })) || []}
                selectedOptions={selectedStandardObjects}
                onChange={(options) => setSelectedStandardObjects(options)}
                isClearable={true}
                isLoading={isLoadingObjects}
                data-test-subj="workchatSalesforceToolStandardObjects"
              />
            </EuiFormRow>
            <EuiFormRow label="Custom Objects">
              <EuiComboBox
                placeholder="Select custom objects to sync"
                options={objectsData?.custom.map((name) => ({ label: name })) || []}
                selectedOptions={selectedCustomObjects}
                onChange={(options) => setSelectedCustomObjects(options)}
                isClearable={true}
                isLoading={isLoadingObjects}
                data-test-subj="workchatSalesforceToolCustomObjects"
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </>
      )}
    </>
  );
};
