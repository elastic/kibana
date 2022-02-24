/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { DescribedFormGroupWithWrap } from './common/described_form_group_with_wrap';
import { ConfigKey, DataStream, Validation } from './types';
import { usePolicyConfigContext } from './contexts';
import { TLSFields } from './tls_fields';
import { HTTPSimpleFields } from './http/simple_fields';
import { HTTPAdvancedFields } from './http/advanced_fields';
import { TCPSimpleFields } from './tcp/simple_fields';
import { TCPAdvancedFields } from './tcp/advanced_fields';
import { ICMPSimpleFields } from './icmp/simple_fields';
import { BrowserSimpleFields } from './browser/simple_fields';
import { BrowserAdvancedFields } from './browser/advanced_fields';
import { ICMPAdvancedFields } from './icmp/advanced_fields';

interface Props {
  validate: Validation;
  dataStreams?: DataStream[];
  children?: React.ReactNode;
  appendAdvancedFields?: React.ReactNode;
  minColumnWidth?: string;
  onFieldBlur?: (field: ConfigKey) => void;
}

const dataStreamToString = [
  { value: DataStream.HTTP, text: 'HTTP' },
  { value: DataStream.TCP, text: 'TCP' },
  { value: DataStream.ICMP, text: 'ICMP' },
  {
    value: DataStream.BROWSER,
    text: i18n.translate(
      'xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browserLabel',
      {
        defaultMessage: 'Browser (Beta)',
      }
    ),
  },
];

export const CustomFields = memo<Props>(
  ({ validate, dataStreams = [], children, appendAdvancedFields, minColumnWidth, onFieldBlur }) => {
    const { monitorType, setMonitorType, isTLSEnabled, setIsTLSEnabled, isEditable } =
      usePolicyConfigContext();

    const isHTTP = monitorType === DataStream.HTTP;
    const isTCP = monitorType === DataStream.TCP;
    const isBrowser = monitorType === DataStream.BROWSER;
    const isICMP = monitorType === DataStream.ICMP;

    const dataStreamOptions = useMemo(() => {
      return dataStreamToString.filter((dataStream) => dataStreams.includes(dataStream.value));
    }, [dataStreams]);

    const renderSimpleFields = (type: DataStream) => {
      switch (type) {
        case DataStream.HTTP:
          return (
            <HTTPSimpleFields validate={validate} onFieldBlur={(field) => onFieldBlur?.(field)} />
          );
        case DataStream.ICMP:
          return (
            <ICMPSimpleFields validate={validate} onFieldBlur={(field) => onFieldBlur?.(field)} />
          );
        case DataStream.TCP:
          return (
            <TCPSimpleFields validate={validate} onFieldBlur={(field) => onFieldBlur?.(field)} />
          );
        case DataStream.BROWSER:
          return (
            <BrowserSimpleFields
              validate={validate}
              onFieldBlur={(field) => onFieldBlur?.(field)}
            />
          );
        default:
          return null;
      }
    };

    const isWithInUptime = window.location.pathname.includes('/app/uptime');

    return (
      <EuiForm component="form">
        <DescribedFormGroupWithWrap
          minColumnWidth={minColumnWidth}
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
              {children}
              {!isEditable && (
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorType"
                      defaultMessage="Monitor Type"
                    />
                  }
                  isInvalid={
                    !!validate[ConfigKey.MONITOR_TYPE]?.({
                      [ConfigKey.MONITOR_TYPE]: monitorType as DataStream,
                    })
                  }
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
                    onBlur={() => onFieldBlur?.(ConfigKey.MONITOR_TYPE)}
                    data-test-subj="syntheticsMonitorTypeField"
                  />
                </EuiFormRow>
              )}
              <EuiSpacer size="s" />
              {isBrowser && !isWithInUptime && (
                <EuiCallOut
                  title={
                    <FormattedMessage
                      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorType.browser.warning.description"
                      defaultMessage='To create a "Browser" monitor, please ensure you are using the elastic-agent-complete Docker container, which contains the dependencies to run these monitors. For more information, please visit our {link}.'
                      values={{
                        link: (
                          <EuiLink
                            target="_blank"
                            href="https://www.elastic.co/guide/en/observability/current/synthetics-quickstart-fleet.html"
                            external
                          >
                            <FormattedMessage
                              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorType.browser.warning.link"
                              defaultMessage="synthetics documentation"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  }
                  iconType="help"
                  size="s"
                />
              )}
              <EuiSpacer size="s" />
              {renderSimpleFields(monitorType)}
            </EuiFlexItem>
          </EuiFlexGroup>
        </DescribedFormGroupWithWrap>
        {(isHTTP || isTCP) && (
          <DescribedFormGroupWithWrap
            minColumnWidth={minColumnWidth}
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
            id="uptimeFleetIsTLSEnabled"
          >
            <EuiSwitch
              id="uptimeFleetIsTLSEnabled"
              data-test-subj="syntheticsIsTLSEnabled"
              checked={!!isTLSEnabled}
              label={
                <FormattedMessage
                  id="xpack.uptime.createPackagePolicy.stepConfigure.certificateSettings.enableSSLSettings.label"
                  defaultMessage="Enable TLS configuration"
                />
              }
              onChange={(event) => setIsTLSEnabled(event.target.checked)}
            />
            <TLSFields />
          </DescribedFormGroupWithWrap>
        )}
        <EuiSpacer size="m" />
        {isHTTP && (
          <HTTPAdvancedFields
            validate={validate}
            minColumnWidth={minColumnWidth}
            onFieldBlur={onFieldBlur}
          >
            {appendAdvancedFields}
          </HTTPAdvancedFields>
        )}
        {isTCP && (
          <TCPAdvancedFields minColumnWidth={minColumnWidth} onFieldBlur={onFieldBlur}>
            {appendAdvancedFields}
          </TCPAdvancedFields>
        )}
        {isBrowser && (
          <BrowserAdvancedFields
            validate={validate}
            minColumnWidth={minColumnWidth}
            onFieldBlur={onFieldBlur}
          >
            {appendAdvancedFields}
          </BrowserAdvancedFields>
        )}
        {isICMP && <ICMPAdvancedFields>{appendAdvancedFields}</ICMPAdvancedFields>}
      </EuiForm>
    );
  }
);
