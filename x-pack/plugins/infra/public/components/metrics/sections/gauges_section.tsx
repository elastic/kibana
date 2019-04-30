/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexItem,
  EuiPageContentBody,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { get, last, max } from 'lodash';
import React, { ReactText } from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { InfraMetricData } from '../../../graphql/types';
import { InfraFormatterType } from '../../../lib/lib';
import { InfraMetricLayoutSection } from '../../../pages/metrics/layouts/types';
import { createFormatter } from '../../../utils/formatters';

interface Props {
  section: InfraMetricLayoutSection;
  metric: InfraMetricData;
}

const getFormatter = (section: InfraMetricLayoutSection, seriesId: string) => (val: ReactText) => {
  if (val == null) {
    return '';
  }
  const defaultFormatter = get(section, ['visConfig', 'formatter'], InfraFormatterType.number);
  const defaultFormatterTemplate = get(section, ['visConfig', 'formatterTemplate'], '{{value}}');
  const formatter = get(
    section,
    ['visConfig', 'seriesOverrides', seriesId, 'formatter'],
    defaultFormatter
  );
  const formatterTemplate = get(
    section,
    ['visConfig', 'seriesOverrides', seriesId, 'formatterTemplate'],
    defaultFormatterTemplate
  );
  return createFormatter(formatter, formatterTemplate)(val);
};

export class GaugesSection extends React.PureComponent<Props> {
  public render() {
    const { metric, section } = this.props;
    return (
      <EuiPageContentBody>
        <EuiSpacer size="m" />
        <GroupBox>
          {metric.series.map(series => {
            const lastDataPoint = last(series.data);
            if (!lastDataPoint) {
              return null;
            }
            const formatter = getFormatter(section, series.id);
            const value = formatter(lastDataPoint.value || 0);
            const name = get(
              section,
              ['visConfig', 'seriesOverrides', series.id, 'name'],
              series.id
            );
            const dataMax = max(series.data.map(d => d.value || 0));
            const gaugeMax = get(
              section,
              ['visConfig', 'seriesOverrides', series.id, 'gaugeMax'],
              dataMax
            );
            return (
              <EuiFlexItem key={`${section.id}-${series.id}`} style={{ margin: '0.4rem' }}>
                <EuiPanel style={{ minWidth: '160px' }}>
                  <EuiText style={{ textAlign: 'right' }} size="s">
                    {name}
                  </EuiText>
                  <EuiTitle size="s">
                    <h1 style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{value}</h1>
                  </EuiTitle>
                  <EuiProgress
                    value={lastDataPoint.value || 0}
                    max={gaugeMax}
                    size="s"
                    color="primary"
                  />
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </GroupBox>
        <EuiSpacer size="m" />
      </EuiPageContentBody>
    );
  }
}

const GroupBox = euiStyled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-evenly;
`;
