/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { NoIndices } from './no_indices';

export const NoRemoteCluster = () => {
  const settingLinkProps = useLinkProps({ app: 'metrics', pathname: '/settings' });

  const goToSettings = (
    <EuiButton data-test-subj="infraHostsPageGoToSettings" color="danger" {...settingLinkProps}>
      {i18n.translate('xpack.infra.hostsPage.goToMetricsSettings', {
        defaultMessage: 'Check settings',
      })}
    </EuiButton>
  );

  return (
    <NoIndices
      color="danger"
      iconType="error"
      titleSize="m"
      data-test-subj="infraHostsNoRemoteCluster"
      title={i18n.translate('xpack.infra.sourceConfiguration.noRemoteClusterTitle', {
        defaultMessage: "Couldn't connect to the remote cluster",
      })}
      body={i18n.translate('xpack.infra.sourceConfiguration.noRemoteClusterMessage', {
        defaultMessage:
          "We're unable to connect to the remote cluster, which is preventing us from retrieving the metrics and data you need.\nTo resolve this issue, please check your indices configuration and ensure that it's properly configured.",
      })}
      actions={[goToSettings]}
    />
  );
};
