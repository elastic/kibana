/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { ClientPluginsStart } from '../../../../../../plugin';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../../../../../common/constants/synthetics_alerts';

export function generateFilter(types: string[]) {
  if (types.length === 0) {
    return '';
  }

  return types.reduce((acc, type) => {
    if (acc === '') {
      return `alert.attributes.alertTypeId: "${type}"`;
    }
    return `${acc} OR alert.attributes.alertTypeId: "${type}"`;
  }, '');
}

interface RuleInfo {
  id: string;
  enabled: boolean;
  name: string;
  rule_type_id: string;
}

export function useActiveRules() {
  const { http } = useKibana<ClientPluginsStart>().services;

  const { data, loading } = useFetcher(
    () =>
      http.get(`/internal/alerting/rules/_find`, {
        query: {
          filter: generateFilter([SYNTHETICS_TLS_RULE, SYNTHETICS_STATUS_RULE]),
        },
      }),
    [http]
  );

  return { activeRuleLoading: loading, activeRules: (data as { data?: RuleInfo[] })?.data ?? [] };
}
