/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiIconTip, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { MLSingleMetricLink } from '../../links/machine_learning_links/mlsingle_metric_link';

interface Props {
  hasValidMlLicense?: boolean;
  mlJobId?: string;
}

const ShiftedIconWrapper = euiStyled.span`
  padding-right: 5px;
  position: relative;
  top: -1px;
  display: inline-block;
`;

const ShiftedEuiText = euiStyled(EuiText)`
  position: relative;
  top: 5px;
`;

export function MLHeader({ hasValidMlLicense, mlJobId }: Props) {
  const { transactionType, serviceName } = useApmServiceContext();

  const {
    query: { kuery },
  } = useApmParams('/services/{serviceName}');

  if (!hasValidMlLicense || !mlJobId) {
    return null;
  }

  const hasKuery = !isEmpty(kuery);
  const icon = hasKuery ? (
    <EuiIconTip
      aria-label="Warning"
      type="alert"
      color="warning"
      content={i18n.translate(
        'xpack.apm.metrics.transactionChart.machineLearningTooltip.withKuery',
        {
          defaultMessage:
            'The Machine learning results are hidden when the search bar is used for filtering',
        }
      )}
    />
  ) : (
    <EuiIconTip
      content={i18n.translate(
        'xpack.apm.metrics.transactionChart.machineLearningTooltip',
        {
          defaultMessage:
            'The stream displays the expected bounds of the average latency. A red vertical annotation indicates anomalies with an anomaly score of 75 or above.',
        }
      )}
    />
  );

  return (
    <EuiFlexItem grow={false}>
      <ShiftedEuiText size="xs">
        <ShiftedIconWrapper>{icon}</ShiftedIconWrapper>
        <span>
          {i18n.translate(
            'xpack.apm.metrics.transactionChart.machineLearningLabel',
            {
              defaultMessage: 'Machine learning:',
            }
          )}{' '}
        </span>
        <MLSingleMetricLink
          jobId={mlJobId}
          serviceName={serviceName}
          transactionType={transactionType}
        >
          {i18n.translate('xpack.apm.metrics.transactionChart.viewJob', {
            defaultMessage: 'View Job',
          })}
        </MLSingleMetricLink>
      </ShiftedEuiText>
    </EuiFlexItem>
  );
}
