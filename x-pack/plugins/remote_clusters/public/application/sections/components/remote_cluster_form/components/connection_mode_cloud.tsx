/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiDescribedFormGroup,
  EuiTitle,
  EuiFormRow,
  EuiSwitch,
  EuiSpacer,
  EuiFieldText,
  EuiLink,
  EuiFieldNumber,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { proxySettingsUrl } from '../../../../services/documentation';

import { ClusterErrors } from '../validators';
import { FormFields } from '../remote_cluster_form';

export interface Props {
  fields: FormFields;
  onFieldsChange: (fields: Partial<FormFields>) => void;
  fieldsErrors: ClusterErrors;
  areErrorsVisible: boolean;
}

export const ConnectionModeCloud: FunctionComponent<Props> = (props) => {
  const { fields, fieldsErrors, areErrorsVisible, onFieldsChange } = props;
  const { cloudRemoteAddress, serverName, proxySocketConnections, cloudAdvancedOptionsEnabled } =
    fields;
  const { proxyAddress: proxyAddressError } = fieldsErrors;

  return (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.sectionModeTitle"
              defaultMessage="Connection mode"
            />
          </h2>
        </EuiTitle>
      }
      description={
        <>
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.sectionModeCloudDescription"
            defaultMessage="Configure how to connect to the remote cluster."
          />
          <EuiFormRow hasEmptyLabelSpace fullWidth>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.advancedOptionsToggleLabel"
                  defaultMessage="Configure advanced options"
                />
              }
              checked={cloudAdvancedOptionsEnabled}
              data-test-subj="remoteClusterFormCloudUrlToggle"
              onChange={(e) =>
                onFieldsChange({ cloudAdvancedOptionsEnabled: e.target.checked, serverName: '' })
              }
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
        </>
      }
      fullWidth
    >
      <EuiFormRow
        data-test-subj="remoteClusterFormRemoteAddressFormRow"
        label={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.fieldRemoteAddressLabel"
            defaultMessage="Remote address"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.fieldRemoteAddressHelpText"
            defaultMessage="When no port is specified, the default 9400 port is used."
          />
        }
        isInvalid={Boolean(areErrorsVisible && proxyAddressError)}
        error={proxyAddressError}
        fullWidth
      >
        <EuiFieldText
          value={cloudRemoteAddress}
          placeholder={i18n.translate(
            'xpack.remoteClusters.remoteClusterForm.fieldProxyAddressPlaceholder',
            {
              defaultMessage: 'host:port',
            }
          )}
          onChange={(e) => onFieldsChange({ cloudRemoteAddress: e.target.value })}
          isInvalid={Boolean(areErrorsVisible && proxyAddressError)}
          data-test-subj="remoteClusterFormProxyAddressInput"
          fullWidth
        />
      </EuiFormRow>

      {cloudAdvancedOptionsEnabled && (
        <>
          <EuiFormRow
            data-test-subj="remoteClusterFormTLSServerNameFormRow"
            label={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.fieldTLSServerNameLabel"
                defaultMessage="TLS server name (optional)"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.fieldServerNameHelpText"
                defaultMessage="If the remote cluster certificate has a different server name, specify it here. {learnMoreLink}"
                values={{
                  learnMoreLink: (
                    <EuiLink href={proxySettingsUrl} target="_blank">
                      <FormattedMessage
                        id="xpack.remoteClusters.remoteClusterForm.fieldServerNameHelpText.learnMoreLinkLabel"
                        defaultMessage="Learn more."
                      />
                    </EuiLink>
                  ),
                }}
              />
            }
            fullWidth
          >
            <EuiFieldText
              value={serverName}
              onChange={(e) => onFieldsChange({ serverName: e.target.value })}
              fullWidth
            />
          </EuiFormRow>

          <EuiFormRow
            data-test-subj="remoteClusterFormProxySocketConnectionsFormRow"
            label={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.fieldProxySocketConnectionsLabel"
                defaultMessage="Socket connections"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.fieldSocketConnectionsHelpText"
                defaultMessage="The number of connections to open per remote cluster."
              />
            }
            fullWidth
          >
            <EuiFieldNumber
              value={proxySocketConnections || ''}
              onChange={(e) => onFieldsChange({ proxySocketConnections: Number(e.target.value) })}
              fullWidth
            />
          </EuiFormRow>
        </>
      )}
    </EuiDescribedFormGroup>
  );
};
