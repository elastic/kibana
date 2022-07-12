/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiIconTip, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { i18n } from '@kbn/i18n';

export const TotalCountHeader = ({
  totalCount,
  approximate,
}: {
  totalCount: number;
  approximate?: boolean;
}) => {
  return (
    <EuiFlexItem grow={false} style={{ flexDirection: 'row' }}>
      <EuiText size="s" data-test-subj="dataVisualizerTotalDocCountHeader">
        <FormattedMessage
          id="xpack.dataVisualizer.searchPanel.totalDocCountLabel"
          defaultMessage="Total documents: {prepend}{strongTotalCount}"
          values={{
            prepend: approximate ? '~' : '',
            strongTotalCount: (
              <strong data-test-subj="dataVisualizerTotalDocCount">
                <FormattedMessage
                  id="xpack.dataVisualizer.searchPanel.totalDocCountNumber"
                  defaultMessage="{totalCount, plural, one {#} other {#}}"
                  values={{ totalCount }}
                />
              </strong>
            ),
          }}
        />
      </EuiText>
      ]{' '}
      <EuiIconTip
        content={i18n.translate('xpack.dataVisualizer.searchPanel.randomSamplerMessage', {
          defaultMessage:
            'Random sampler is being used for the total document count and the chart. Values shown are estimated. Adjust the slider to a higher percentage for better accuracy, or 100% to exact values.',
        })}
        position="right"
        type="iInCircle"
      />
    </EuiFlexItem>
  );
};
