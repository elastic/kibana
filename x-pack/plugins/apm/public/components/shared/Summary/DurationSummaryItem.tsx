/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiText } from '@elastic/eui';
import { asDuration } from '../../../../common/utils/formatters';
import { PercentOfParent } from '../../app/transaction_details/waterfall_with_summary/percent_of_parent';

interface Props {
  duration: number;
  totalDuration: number | undefined;
  parentType: 'trace' | 'transaction';
}

function DurationSummaryItem({ duration, totalDuration, parentType }: Props) {
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
}

export { DurationSummaryItem };
