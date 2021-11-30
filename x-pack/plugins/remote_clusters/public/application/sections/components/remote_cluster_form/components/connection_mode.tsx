/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiDescribedFormGroup, EuiTitle, EuiFormRow, EuiSwitch, EuiSpacer } from '@elastic/eui';

import { SNIFF_MODE, PROXY_MODE } from '../../../../../../common/constants';
import { useAppContext } from '../../../../app_context';

import { ClusterErrors } from '../validators';
import { SniffConnection } from './sniff_connection';
import { ProxyConnection } from './proxy_connection';
import { FormFields } from '../remote_cluster_form';

export interface Props {
  fields: FormFields;
  onFieldsChange: (fields: Partial<FormFields>) => void;
  fieldsErrors: ClusterErrors;
  areErrorsVisible: boolean;
}

export const ConnectionMode: FunctionComponent<Props> = (props) => {
  const { fields, onFieldsChange } = props;
  const { mode, cloudUrlEnabled } = fields;
  const { isCloudEnabled } = useAppContext();

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
          {isCloudEnabled ? (
            <>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionModeCloudDescription"
                defaultMessage="Automatically configure the remote cluster by using the
    Elasticsearch endpoint URL of the remote deployment or enter the proxy address and server name manually."
              />
              <EuiFormRow hasEmptyLabelSpace fullWidth>
                <EuiSwitch
                  label={
                    <FormattedMessage
                      id="xpack.remoteClusters.remoteClusterForm.manualModeFieldLabel"
                      defaultMessage="Manually enter proxy address and server name"
                    />
                  }
                  checked={!cloudUrlEnabled}
                  data-test-subj="remoteClusterFormCloudUrlToggle"
                  onChange={(e) => onFieldsChange({ cloudUrlEnabled: !e.target.checked })}
                />
              </EuiFormRow>
              <EuiSpacer size="s" />
            </>
          ) : (
            <>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionModeDescription"
                defaultMessage="Use seed nodes by default, or switch to proxy mode."
              />
              <EuiFormRow hasEmptyLabelSpace fullWidth>
                <EuiSwitch
                  label={
                    <FormattedMessage
                      id="xpack.remoteClusters.remoteClusterForm.fieldModeLabel"
                      defaultMessage="Use proxy mode"
                    />
                  }
                  checked={mode === PROXY_MODE}
                  data-test-subj="remoteClusterFormConnectionModeToggle"
                  onChange={(e) =>
                    onFieldsChange({ mode: e.target.checked ? PROXY_MODE : SNIFF_MODE })
                  }
                />
              </EuiFormRow>
            </>
          )}
        </>
      }
      fullWidth
    >
      {mode === SNIFF_MODE ? <SniffConnection {...props} /> : <ProxyConnection {...props} />}
    </EuiDescribedFormGroup>
  );
};
