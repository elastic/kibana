/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiText, EuiLoadingSpinner, EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { i18n } from '@kbn/i18n';

const SIGFIGS_IF_ROUNDING = 3; // Number of sigfigs to use for values < 10

export const TotalCountHeader = ({
  totalCount,
  approximate,
  loading,
}: {
  totalCount: number;
  loading?: boolean;
  approximate?: boolean;
}) => {
  return (
    <EuiFlexItem grow={false} style={{ flexDirection: 'row' }}>
      <EuiText size="s" data-test-subj="dataVisualizerTotalDocCountHeader" textAlign="center">
        <FormattedMessage
          id="xpack.dataVisualizer.searchPanel.totalDocCountLabel"
          defaultMessage="Total documents: {prepend}{strongTotalCount}"
          values={{
            prepend: !loading && approximate ? '~' : '',
            strongTotalCount: loading ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              <strong data-test-subj="dataVisualizerTotalDocCount">
                <FormattedMessage
                  id="xpack.dataVisualizer.searchPanel.totalDocCountNumber"
                  defaultMessage="{totalCount, plural, one {#} other {#}}"
                  values={{
                    totalCount: approximate
                      ? totalCount.toPrecision(SIGFIGS_IF_ROUNDING)
                      : totalCount,
                  }}
                />
              </strong>
            ),
          }}
        />
      </EuiText>
      {approximate ? (
        <EuiIconTip
          content={i18n.translate('xpack.dataVisualizer.searchPanel.randomSamplerMessage', {
            defaultMessage:
              'Approximate values are shown in the total document count and chart, which use random sampler aggregations.',
          })}
          position="right"
          type="iInCircle"
        />
      ) : null}
    </EuiFlexItem>
  );
};
