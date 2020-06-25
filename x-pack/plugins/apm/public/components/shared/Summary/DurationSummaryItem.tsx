/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiText } from '@elastic/eui';
import { PercentOfParent } from '../../app/TransactionDetails/WaterfallWithSummmary/PercentOfParent';
import { asDuration } from '../../../utils/formatters';

interface Props {
  duration: number;
  totalDuration: number | undefined;
  parentType: 'trace' | 'transaction';
}

const DurationSummaryItem = ({
  duration,
  totalDuration,
  parentType,
}: Props) => {
  const calculatedTotalDuration =
    totalDuration === undefined ? duration : totalDuration;

  const label = i18n.translate('xpack.apm.transactionDurationLabel', {
    defaultMessage: 'Duration',
  });
  return (
    <>
      <EuiToolTip content={label}>
        <EuiText>{asDuration(duration)}</EuiText>
      </EuiToolTip>
      &nbsp;
      <EuiText size="s">
        <PercentOfParent
          duration={duration}
          totalDuration={calculatedTotalDuration}
          parentType={parentType}
        />
      </EuiText>
    </>
  );
};

export { DurationSummaryItem };
