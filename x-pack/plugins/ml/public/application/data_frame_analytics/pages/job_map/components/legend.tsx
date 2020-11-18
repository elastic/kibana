/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { JOB_MAP_NODE_TYPES } from '../../../../../../common/constants/data_frame_analytics';

export const JobMapLegend: FC = () => (
  <EuiFlexGroup className="mlJobMapLegend__container" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <span className="mlJobMapLegend__indexPattern" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.ml.dataframe.analyticsMap.legend.indexLabel"
              defaultMessage={JOB_MAP_NODE_TYPES.INDEX}
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <span className="mlJobMapLegend__transform" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {JOB_MAP_NODE_TYPES.TRANSFORM}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <span className="mlJobMapLegend__analytics" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.ml.dataframe.analyticsMap.legend.analyticsJobLabel"
              defaultMessage={`${JOB_MAP_NODE_TYPES.ANALYTICS} job`}
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <span className="mlJobMapLegend__trainedModel" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.ml.dataframe.analyticsMap.legend.trainedModelLabel"
              defaultMessage="trained model"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <span className="mlJobMapLegend__sourceNode" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.ml.dataframe.analyticsMap.legend.rootNodeLabel"
              defaultMessage="source node"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);
