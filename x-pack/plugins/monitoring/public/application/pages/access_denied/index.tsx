/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiCallOut, EuiButton } from '@elastic/eui';
import useInterval from 'react-use/lib/useInterval';
import { Redirect } from 'react-router-dom';
import { ComponentProps } from '../../route_init';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { MonitoringStartPluginDependencies } from '../../../types';

export const AccessDeniedPage: React.FC<ComponentProps> = () => {
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
