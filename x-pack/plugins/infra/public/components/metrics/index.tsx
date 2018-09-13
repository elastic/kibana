/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingChart, EuiPageContentBody, EuiTitle } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { InfraMetricData } from '../../../common/graphql/types';
import { InfraMetricLayout, InfraMetricLayoutSection } from '../../pages/metrics/layouts/types';
import { Section } from './section';

interface Props {
  metrics: InfraMetricData[];
  layout: InfraMetricLayout[];
}

export class Metrics extends React.PureComponent<Props> {
  public render() {
    if (this.props.metrics.length === 0) {
      return (
        <LoadingContainer>
          <EuiLoadingChart />
        </LoadingContainer>
      );
    }
    return <React.Fragment>{this.props.layout.map(this.renderLayout)}</React.Fragment>;
  }

  private renderLayout = (layout: InfraMetricLayout) => {
    return (
      <React.Fragment key={layout.id}>
        <EuiPageContentBody>
          <EuiTitle size="m">
            <h2>{layout.label}</h2>
          </EuiTitle>
        </EuiPageContentBody>
        {layout.sections.map(this.renderSection(layout))}
      </React.Fragment>
    );
  };

  private renderSection = (layout: InfraMetricLayout) => (section: InfraMetricLayoutSection) => {
    return (
      <Section section={section} metrics={this.props.metrics} key={`${layout.id}-${section.id}`} />
    );
  };
}

const LoadingContainer = styled.div`
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
`;
