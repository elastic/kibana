/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiDescribedFormGroup,
  EuiCheckbox,
} from '@elastic/eui';
import { ConfigKeys, DataStream, Validation } from './types';
import { useMonitorTypeContext } from './contexts';
import { TLSFields, TLSRole } from './tls_fields';
import { HTTPSimpleFields } from './http/simple_fields';
import { HTTPAdvancedFields } from './http/advanced_fields';
import { TCPSimpleFields } from './tcp/simple_fields';
import { TCPAdvancedFields } from './tcp/advanced_fields';
import { ICMPSimpleFields } from './icmp/simple_fields';

interface Props {
  typeEditable?: boolean;
  isTLSEnabled?: boolean;
  validate: Validation;
}

export const CustomFields = memo<Props>(
  ({ typeEditable = false, isTLSEnabled: defaultIsTLSEnabled = false, validate }) => {
    const [isTLSEnabled, setIsTLSEnabled] = useState<boolean>(defaultIsTLSEnabled);
    const { monitorType, setMonitorType } = useMonitorTypeContext();

    const isHTTP = monitorType === DataStream.HTTP;
    const isTCP = monitorType === DataStream.TCP;

    const renderSimpleFields = (type: DataStream) => {
      switch (type) {
        case DataStream.HTTP:
          return <HTTPSimpleFields validate={validate} />;
        case DataStream.ICMP:
          return <ICMPSimpleFields validate={validate} />;
        case DataStream.TCP:
          return <TCPSimpleFields validate={validate} />;
        default:
          return null;
      }
    };

    return (
      <EuiForm component="form">
        <EuiDescribedFormGroup
          title={
            <h4>
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSectionTitle"
                defaultMessage="Monitor settings"
              />
            </h4>
          }
          description={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSectionDescription"
              defaultMessage="Configure your monitor with the following options."
            />
          }
          data-test-subj="monitorSettingsSection"
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              {typeEditable && (
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorType"
                      defaultMessage="Monitor Type"
                    />
                  }
                  isInvalid={!!validate[ConfigKeys.MONITOR_TYPE]?.(monitorType)}
                  error={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorType.error"
                      defaultMessage="Monitor type is required"
                    />
                  }
                >
                  <EuiSelect
                    options={dataStreamOptions}
                    value={monitorType}
                    onChange={(event) => setMonitorType(event.target.value as DataStream)}
                    data-test-subj="syntheticsMonitorTypeField"
                  />
                </EuiFormRow>
              )}
              {renderSimpleFields(monitorType)}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescribedFormGroup>
        {(isHTTP || isTCP) && (
          <EuiDescribedFormGroup
            title={
              <h4>
                <FormattedMessage
                  id="xpack.uptime.createPackagePolicy.stepConfigure.tlsSettings.label"
                  defaultMessage="TLS settings"
                />
              </h4>
            }
            description={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.tlsSettings.description"
                defaultMessage="Configure TLS options, including verification mode, certificate authorities, and client certificates."
              />
            }
            data-test-subj="syntheticsIsTLSEnabled"
          >
            <EuiCheckbox
              id={'uptimeFleetIsTLSEnabled'}
              checked={isTLSEnabled}
              label={
                <FormattedMessage
                  id="xpack.uptime.createPackagePolicy.stepConfigure.certificateSettings.enableSSLSettings.label"
                  defaultMessage="Enable TLS configuration"
                />
              }
              onChange={(event) => setIsTLSEnabled(event.target.checked)}
            />
            <TLSFields tlsRole={TLSRole.CLIENT} isEnabled={isTLSEnabled} />
          </EuiDescribedFormGroup>
        )}
        <EuiSpacer size="m" />
        {isHTTP && <HTTPAdvancedFields validate={validate} />}
        {isTCP && <TCPAdvancedFields />}
      </EuiForm>
    );
  }
);

const dataStreamOptions = [
  { value: DataStream.HTTP, text: 'HTTP' },
  { value: DataStream.TCP, text: 'TCP' },
  { value: DataStream.ICMP, text: 'ICMP' },
];
