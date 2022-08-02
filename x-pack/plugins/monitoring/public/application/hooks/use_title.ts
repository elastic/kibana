/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';

// TODO: verify that works for all pages
export function useTitle(cluster: string, suffix: string) {
  const { services } = useKibana();
  let clusterName = get(cluster, 'cluster_name');
  clusterName = clusterName ? `- ${clusterName}` : '';
  suffix = suffix ? `- ${suffix}` : '';

  services.chrome?.docTitle.change(
    i18n.translate('xpack.monitoring.stackMonitoringDocTitle', {
      defaultMessage: 'Stack Monitoring {clusterName} {suffix}',
      values: { clusterName, suffix },
    })
  );
}
