/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  samplerShardSize: number;
  setSamplerShardSize(s: number): void;
}

const searchSizeOptions = [1000, 5000, 10000, 100000, -1].map((v) => {
  return {
    value: String(v),
    inputDisplay:
      v > 0 ? (
        <span data-test-subj={`dataVisualizerShardSizeOption ${v}`}>
          <FormattedMessage
            id="xpack.dataVisualizer.searchPanel.sampleSizeOptionLabel"
            defaultMessage="Sample size (per shard): {wrappedValue}"
            values={{ wrappedValue: <b>{v}</b> }}
          />
        </span>
      ) : (
        <span data-test-subj={`dataVisualizerShardSizeOption all`}>
          <FormattedMessage
            id="xpack.dataVisualizer.searchPanel.allOptionLabel"
            defaultMessage="Search all"
          />
        </span>
      ),
  };
});

export const ShardSizeFilter: FC<Props> = ({ samplerShardSize, setSamplerShardSize }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false} style={{ width: 310 }}>
        <EuiSuperSelect
          options={searchSizeOptions}
          valueOfSelected={String(samplerShardSize)}
          onChange={(value) => setSamplerShardSize(+value)}
          aria-label={i18n.translate('xpack.dataVisualizer.searchPanel.sampleSizeAriaLabel', {
            defaultMessage: 'Select number of documents to sample',
          })}
          data-test-subj="dataVisualizerShardSizeSelect"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          content={i18n.translate('xpack.dataVisualizer.searchPanel.queryBarPlaceholder', {
            defaultMessage:
              'Selecting a smaller sample size will reduce query run times and the load on the cluster.',
          })}
          position="right"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
