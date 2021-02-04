/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { MetricsHostsAnomaly } from '../../../../../../../../common/http_api/infra_ml/results';
import { formatOneDecimalPlace } from '../../../../../../../../common/log_analysis';

export const AnomalySummary = ({ anomaly }: { anomaly: MetricsHostsAnomaly }) => {
  const { actual, typical } = anomaly;

  const moreThanExpectedAnomalyMessage = i18n.translate(
    'xpack.infra.ml.anomalyFlyout.anomaliesTableMoreThanExpectedAnomalyMessage',
    {
      defaultMessage: 'more',
    }
  );

  const fewerThanExpectedAnomalyMessage = i18n.translate(
    'xpack.infra.ml.anomalyFlyout.anomaliesTableFewerThanExpectedAnomalyMessage',
    {
      defaultMessage: 'fewer',
    }
  );

  const isMore = actual > typical;
  const message = isMore ? moreThanExpectedAnomalyMessage : fewerThanExpectedAnomalyMessage;
  const ratio = isMore ? actual / typical : typical / actual;
  const icon = isMore ? 'sortUp' : 'sortDown';
  // Edge case scenarios where actual and typical might sit at 0.
  const useRatio = ratio !== Infinity;
  const ratioMessage = useRatio ? `${formatOneDecimalPlace(ratio)}x` : '';

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
      <EuiFlexItem grow={false} component="span">
        <EuiIcon type={icon} />
      </EuiFlexItem>
      <EuiFlexItem component="span">
        {`${ratioMessage} ${message}`}
        {/* {anomaly.categoryRegex && (
          <>
            {': '}
            <RegularExpressionRepresentation regularExpression={anomaly.categoryRegex} />
          </>
        )} */}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
