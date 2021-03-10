/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiAccordion,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiLink,
  EuiFieldText,
  EuiSpacer,
} from '@elastic/eui';

import { ConfigKeys, ICustomFields } from './types';

import { OptionalLabel } from './optional_label';
import { ComboBox } from './combo_box';

interface Props {
  fields: ICustomFields;
  onCheckboxChange: ({
    event,
    configKey,
  }: {
    event: React.ChangeEvent<HTMLInputElement>;
    configKey: ConfigKeys;
  }) => void;
  onInputChange: ({
    event,
    configKey,
  }: {
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>;
    configKey: ConfigKeys;
  }) => void;
  setFields: React.Dispatch<React.SetStateAction<ICustomFields>>;
}

export const TCPAdvancedFields = ({
  fields,
  onCheckboxChange,
  onInputChange,
  setFields,
}: Props) => {
  return (
    <EuiAccordion id="uptimeFleetAdvancedOptions" buttonContent="Advanced options">
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationTCPRequestSettingsSectionTitle"
              defaultMessage="Request configuration"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationRequestTCPSettingsSectionDescription"
            defaultMessage="Configure your Heartbeat monitor with the following options. Find information about each option in the {link}."
            values={{
              link: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/beats/heartbeat/current/monitor-options.html"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.uptime.createPackagePolicy.stepConfigure.heartbeatDocs"
                    defaultMessage="Heartbeat docs"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiSpacer size="s" />
        <EuiFormRow label="Request payload" labelAppend={<OptionalLabel />}>
          <EuiFieldText
            value={fields[ConfigKeys.REQUEST_SEND_CHECK]}
            onChange={(event) => onInputChange({ event, configKey: ConfigKeys.REQUEST_SEND_CHECK })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationTCPResponseSettingsSectionTitle"
              defaultMessage="Response checks"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationTCPResponseSettingsSectionDescription"
            defaultMessage="Configure your Heartbeat monitor with the following options. Find information about each option in the {link}."
            values={{
              link: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/beats/heartbeat/current/monitor-options.html"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.uptime.createPackagePolicy.stepConfigure.tcp.heartbeatDocs"
                    defaultMessage="Heartbeat docs"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiFormRow label="Check response contains" labelAppend={<OptionalLabel />}>
          <ComboBox
            configKey={ConfigKeys.RESPONSE_RECEIVE_CHECK}
            selectedOptions={fields[ConfigKeys.RESPONSE_RECEIVE_CHECK]}
            setFields={setFields}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiAccordion>
  );
};
