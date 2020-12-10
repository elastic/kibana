/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiIconTip, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { MLJobLink } from '../../Links/MachineLearningLinks/MLJobLink';

interface Props {
  hasValidMlLicense?: boolean;
  mlJobId?: string;
}

const ShiftedIconWrapper = styled.span`
  padding-right: 5px;
  position: relative;
  top: -1px;
  display: inline-block;
`;

const ShiftedEuiText = styled(EuiText)`
  position: relative;
  top: 5px;
`;

export function MLHeader({ hasValidMlLicense, mlJobId }: Props) {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams } = useUrlParams();

  if (!hasValidMlLicense || !mlJobId) {
    return null;
  }

  const { kuery, transactionType } = urlParams;

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
            'The stream around the average duration shows the expected bounds. An annotation is shown for anomaly scores ≥ 75.',
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
        <MLJobLink
          jobId={mlJobId}
          serviceName={serviceName}
          transactionType={transactionType}
        >
          {i18n.translate('xpack.apm.metrics.transactionChart.viewJob', {
            defaultMessage: 'View Job',
          })}
        </MLJobLink>
      </ShiftedEuiText>
    </EuiFlexItem>
  );
}
