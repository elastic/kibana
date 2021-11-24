/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const TotalCountHeader = ({ totalCount }: { totalCount: number }) => {
  return (
    <EuiFlexItem>
      <EuiText size="s" data-test-subj="dataVisualizerTotalDocCountHeader">
        <FormattedMessage
          id="xpack.dataVisualizer.searchPanel.totalDocCountLabel"
          defaultMessage="Total documents: {strongTotalCount}"
          values={{
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
    </EuiFlexItem>
  );
};
