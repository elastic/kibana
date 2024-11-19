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

interface Props {
  count: number;
  durationSum: number;
}

function CompositeSpanDurationSummaryItem({ count, durationSum }: Props) {
  const avgDuration = durationSum / count;

  return (
    <EuiToolTip
      content={i18n.translate('xpack.apm.compositeSpanDurationLabel', {
        defaultMessage: 'Average duration',
      })}
    >
      <EuiText>
        {i18n.translate('xpack.apm.compositeSpanCallsLabel', {
          defaultMessage: `, {count} calls, on avg. {duration}`,
          values: {
            count,
            duration: asDuration(avgDuration),
          },
        })}
      </EuiText>
    </EuiToolTip>
  );
}

export { CompositeSpanDurationSummaryItem };
