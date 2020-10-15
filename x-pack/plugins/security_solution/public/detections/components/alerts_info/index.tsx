/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import React, { useState, useEffect } from 'react';

import { useQueryAlerts } from '../../containers/detection_engine/alerts/use_query';
import { buildLastAlertsQuery } from './query.dsl';
import { Aggs } from './types';

interface AlertInfo {
  ruleId?: string | null;
}

type Return = [React.ReactNode, React.ReactNode];

export const useAlertInfo = ({ ruleId = null }: AlertInfo): Return => {
  const [lastAlerts, setLastAlerts] = useState<React.ReactElement | null>(
    <EuiLoadingSpinner size="m" />
  );
  const [totalAlerts, setTotalAlerts] = useState<React.ReactElement | null>(
    <EuiLoadingSpinner size="m" />
  );

  const { loading, data: alerts } = useQueryAlerts<unknown, Aggs>(buildLastAlertsQuery(ruleId));

  useEffect(() => {
    if (alerts != null) {
      const myAlerts = alerts;
      setLastAlerts(
        myAlerts.aggregations?.lastSeen.value != null ? (
          <FormattedRelative
            value={new Date(myAlerts.aggregations?.lastSeen.value_as_string ?? '')}
          />
        ) : null
      );
      setTotalAlerts(<>{myAlerts.hits.total.value}</>);
    } else {
      setLastAlerts(null);
      setTotalAlerts(null);
    }
  }, [loading, alerts]);

  return [lastAlerts, totalAlerts];
};
