/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiCallOut, EuiButton } from '@elastic/eui';
import useInterval from 'react-use/lib/useInterval';
import { Redirect } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ComponentProps } from '../../route_init';
import { MonitoringStartPluginDependencies } from '../../../types';
import { ExternalConfigContext } from '../../contexts/external_config_context';

export const AccessDeniedPage: React.FC<ComponentProps> = () => {
  const { isCcsEnabled } = useContext(ExternalConfigContext);
  const { services } = useKibana<MonitoringStartPluginDependencies>();
  const [hasAccess, setHasAccess] = useState<boolean>(false);

  useInterval(() => {
    async function tryPrivilege() {
      if (services.http?.fetch) {
        try {
          const response = await services.http?.fetch<{ has_access: boolean }>(
            '../api/monitoring/v1/check_access'
          );
          setHasAccess(response.has_access);
        } catch (e) {
          setHasAccess(false);
        }
      }
    }
    tryPrivilege();
  }, 5000);

  const title = i18n.translate('xpack.monitoring.accessDeniedTitle', {
    defaultMessage: 'Access Denied',
  });

  if (hasAccess) {
    return <Redirect to="/home" />;
  }
  return (
    <EuiPanel paddingSize="m">
      <EuiCallOut title={title} color="danger" iconType="alert" data-test-subj="accessDeniedTitle">
        <p>
          <FormattedMessage
            id="xpack.monitoring.accessDenied.notAuthorizedDescription"
            defaultMessage="You are not authorized to access Monitoring. To use Monitoring, you
        need the privileges granted by both the `{kibanaAdmin}` and
        `{monitoringUser}` roles."
            values={{ kibanaAdmin: 'kibana_admin', monitoringUser: 'monitoring_user ' }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.monitoring.accessDenied.clusterNotConfiguredDescription"
            defaultMessage="If you are attempting to access a dedicated monitoring cluster, this
        might be because you are logged in as a user that is not configured on
        the monitoring cluster."
          />
        </p>
        {isCcsEnabled && (
          <p>
            <FormattedMessage
              id="xpack.monitoring.accessDenied.noRemoteClusterClientDescription"
              defaultMessage="Since Cross Cluster Search is enabled (`monitoring.ui.ccs.enabled` is set to `true`), make sure your cluster has the `remote_cluster_client` role on at least one node."
            />
          </p>
        )}
        <p>
          <EuiButton href="../app/home">
            <FormattedMessage
              id="xpack.monitoring.accessDenied.backToKibanaButtonLabel"
              defaultMessage="Back to Kibana"
            />
          </EuiButton>
        </p>
      </EuiCallOut>
    </EuiPanel>
  );
};
