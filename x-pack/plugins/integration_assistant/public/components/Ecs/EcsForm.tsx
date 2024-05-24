/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiForm,
  EuiFieldText,
  EuiFormRow,
  EuiComboBox,
  EuiPanel,
  EuiFlexGroup,
  EuiSpacer,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { EcsButtons } from './EcsButtons';
import { useGlobalStore } from '@Stores/useGlobalStore';
import { EcsFileUpload } from './EcsFileUpload';

export const EcsForm = () => {
  const packageName = useGlobalStore((state) => state.packageName);
  const packageTitle = useGlobalStore((state) => state.packageTitle);
  const packageVersion = useGlobalStore((state) => state.packageVersion);
  const dataStreamName = useGlobalStore((state) => state.dataStreamName);
  const dataStreamTitle = useGlobalStore((state) => state.dataStreamTitle);
  const logFormat = useGlobalStore((state) => state.logFormat);
  const inputTypes = useGlobalStore((state) => state.inputTypes);
  const setEcsMappingFormValue = useGlobalStore((state) => state.setEcsMappingFormValue);
  const setEcsMappingFormArrayValue = useGlobalStore((state) => state.setEcsMappingFormArrayValue);
  const selectLogId = useGeneratedHtmlId({ prefix: 'log_format' });
  const handleFormStateChange = (key: string, value: string) => {
    setEcsMappingFormValue(key, value);
  };
  const onInputTypeChange = (selected) => {
    setEcsMappingFormArrayValue(
      'inputTypes',
      selected.map((item) => item.label)
    );
  };

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup justifyContent="spaceEvenly">
        <EuiForm component="form">
          <EuiFormRow
            label="Package Name"
            helpText="Which vendor is the log sample from? (e.g. cisco, microsoft, etc.)"
          >
            <EuiFieldText
              placeholder="mysql_enterprise"
              aria-label="package-name"
              value={packageName}
              onChange={(e) => handleFormStateChange('packageName', e.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow label="Package Title" helpText="The title used for the integration UI">
            <EuiFieldText
              placeholder="MySQL Enterprise"
              aria-label="package-title"
              value={packageTitle}
              onChange={(e) => handleFormStateChange('packageTitle', e.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow
            label="Package Version"
            helpText="The initial version of the package, default 0.1.0"
          >
            <EuiFieldText
              placeholder="0.1.0"
              aria-label="package-version"
              value={packageVersion}
              onChange={(e) => handleFormStateChange('packageVersion', e.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow
            label="Data Stream Name"
            helpText="Which product from the vendor? (e.g. asa, firewall, etc.)"
          >
            <EuiFieldText
              placeholder="audit"
              aria-label="ds-name"
              value={dataStreamName}
              onChange={(e) => handleFormStateChange('dataStreamName', e.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow
            label="Data Stream Title"
            helpText="The title for the Data Stream used in the integration UI"
          >
            <EuiFieldText
              placeholder="MySQL Audit logs"
              aria-label="ds-name"
              value={dataStreamTitle}
              onChange={(e) => handleFormStateChange('dataStreamTitle', e.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow fullWidth label="Log format">
            <EuiSelect
              id={selectLogId}
              options={[
                { value: 'json', text: 'JSON/NDJSON' },
                { value: 'kv', text: 'Key-value pairs' },
                { value: 'csv', text: 'CSV' },
                { value: 'structured_syslog', text: 'Structured Syslog' },
                { value: 'unstructed_syslog', text: 'Unstructured Syslog' },
              ]}
              value={logFormat}
              onChange={(e) => handleFormStateChange('logFormat', e.target.value)}
              aria-label="log-format-select"
            />
          </EuiFormRow>
          <EuiFormRow fullWidth label="Data Collection methods">
            <EuiComboBox
              fullWidth={true}
              placeholder="Data Collection methods"
              aria-label="choose-inputs"
              selectedOptions={inputTypes.map((type) => ({ label: type }))}
              options={[
                { label: 'filestream', content: 'Log File' },
                { label: 'tcp', content: 'TCP' },
                { label: 'udp', content: 'UDP' },
                { label: 'cel', content: 'HTTP API' },
                { label: 'gcp-pubsub', content: 'GCP Pubsub' },
                { label: 'gcs', content: 'Google Cloud Storage' },
                { label: 'http_endpoint', content: 'Incoming HTTP Webhooks' },
                { label: 'journald', content: 'JournalD' },
                { label: 'kafka', content: 'Kafka' },
                { label: 'cloudfoundry', content: 'CloudFoundry' },
                { label: 'aws-cloudwatch', content: 'AWS Cloudwatch' },
                { label: 'aws-s3', content: 'AWS S3' },
                { label: 'azure-blob-storage', content: 'Azure Blob Storage' },
                { label: 'azure-eventhub', content: 'Azure Eventhub' },
              ]}
              onChange={onInputTypeChange}
            />
          </EuiFormRow>
          <EuiFormRow label={'Upload samples (currently only supports ndjson)'}>
            <EcsFileUpload />
          </EuiFormRow>
        </EuiForm>
      </EuiFlexGroup>
      <EuiSpacer />
      <EcsButtons />
    </EuiPanel>
  );
};
