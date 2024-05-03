/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { EuiComboBox, EuiIconTip } from '@elastic/eui';
import React, { useMemo } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';

const API_KEY_SECURITY_MODEL = 'api_key';

interface Props extends Omit<EuiComboBoxProps<string | number | string[] | undefined>, 'options'> {
  remoteClusters: Cluster[];
  type: 'remote_cluster' | 'remote_indexes';
}

export const RemoteClusterComboBox: React.FunctionComponent<Props> = ({
  remoteClusters,
  type,
  ...restProps
}) => {
  const remoteClusterOptions = useMemo<EuiComboBoxOptionOption[]>(() => {
    const { incompatible, remote } = remoteClusters.reduce<{
      remote: EuiComboBoxOptionOption[];
      incompatible: EuiComboBoxOptionOption[];
    }>(
      (data, item) => {
        const disabled = item.securityModel !== API_KEY_SECURITY_MODEL;

        if (!disabled) {
          data.remote.push({ label: item.name });

          return data;
        }

        data.incompatible.push({
          label: item.name,
          disabled,
          append: disabled ? (
            <EuiIconTip
              type="warning"
              color="inherit"
              content={
                type === 'remote_cluster' ? (
                  <FormattedMessage
                    id="xpack.security.management.editRole.remoteClusterPrivilegeForm.remoteClusterSecurityModelWarning"
                    defaultMessage="This cluster is configured with the certificate based security model and does not support remote cluster privileges. Connect this cluster with the API key based security model instead to use remote cluster privileges."
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.security.management.editRole.indexPrivilegeForm.remoteIndicesSecurityModelWarning"
                    defaultMessage="This cluster is configured with the certificate based security model and does not support remote index privileges. Connect this cluster with the API key based security model instead to use remote index privileges."
                  />
                )
              }
            />
          ) : undefined,
        });

        return data;
      },
      {
        incompatible: [],
        remote: [],
      }
    );

    if (incompatible.length) {
      remote.push(
        {
          label: 'Incompatible clusters',
          isGroupLabelOption: true,
        },
        ...incompatible
      );
    }

    return remote;
  }, [remoteClusters, type]);

  return <EuiComboBox {...restProps} options={remoteClusterOptions} />;
};
