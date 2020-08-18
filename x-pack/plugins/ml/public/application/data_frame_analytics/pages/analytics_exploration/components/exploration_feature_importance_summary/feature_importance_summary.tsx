/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { Chart, Settings, Axis, ScaleType, Position, BarSeries } from '@elastic/charts';
import { useMlKibana } from '../../../../../contexts/kibana';

const mockData = [
  {
    feature_name: 'g4',
    importance: {
      mean: 233.4600671221131,
      variance: 16372.967040744528,
      min: -565.7664157184156,
      max: 468.8953979253651,
    },
  },
  {
    feature_name: 'g3',
    importance: {
      mean: 227.52681995349807,
      variance: 15305.348788185232,
      min: -474.187447119175,
      max: 500.79764582176218,
    },
  },
  {
    feature_name: 'g1',
    importance: {
      mean: 479.8491325534919,
      variance: 1056.2609531379472,
      min: -584.6059620924166,
      max: 601.3424189083114,
    },
  },
  {
    feature_name: 'g2',
    importance: {
      mean: 729.7375145579323,
      variance: 173166.9595517114,
      min: -1438.469059491588,
      max: 1428.738023747545,
    },
  },
]
  .sort((a, b) => b.importance.mean - a.importance.mean)
  .map((d) => [d.feature_name, d.importance.mean]);

const tooltipContent = i18n.translate(
  'xpack.ml.dataframe.analytics.exploration.featureImportanceSummaryTooltipContent',
  {
    defaultMessage:
      'Shows to what degree a given feature of a data point contributes to the prediction. The magnitude of feature importance shows how significantly the feature affects the prediction both locally (for a given data point) or generally (for the whole data set).',
  }
);
export const FeatureImportanceSummary = () => {
  const {
    services: { docLinks },
  } = useMlKibana();

  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;

  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <span>
              <FormattedMessage
                id="xpack.ml.dataframe.analytics.exploration.featureImportanceSummaryTitle"
                defaultMessage="Feature importance summary"
              />
            </span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={tooltipContent} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSpacer />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            target="_blank"
            iconType="help"
            iconSide="left"
            color="primary"
            href={`${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-feature-importance.html`}
          >
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.exploration.featureImportanceDocsLink"
              defaultMessage="Feature importance docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Chart className="story-chart" size={{ width: '100%', height: 300 }}>
        <Settings rotation={90} />

        <Axis id="x-axis" title="Feature importance average magnitude" position={Position.Bottom} />
        <Axis id="y-axis" title="" position={Position.Left} />
        <BarSeries
          id="bars"
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Linear}
          xAccessor={0}
          yAccessors={[1]}
          data={mockData}
        />
      </Chart>
    </EuiPanel>
  );
};
