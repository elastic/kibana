/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIconTip } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { useUrlParams } from '../../../../hooks/useUrlParams';
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
  const { urlParams } = useUrlParams();

  if (!hasValidMlLicense || !mlJobId) {
    return null;
  }

  const { serviceName, kuery, transactionType } = urlParams;
  if (!serviceName) {
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
            defaultMessage: 'View Job:',
          })}
        </MLJobLink>
      </ShiftedEuiText>
    </EuiFlexItem>
  );
}
