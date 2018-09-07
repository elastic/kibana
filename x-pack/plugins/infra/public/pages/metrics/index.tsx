/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiCallOut,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageSideBar,
  EuiSideNav,
  EuiTitle,
} from '@elastic/eui';
import styled from 'styled-components';
import { InfraMetric, InfraNodeType } from '../../../common/graphql/types';
import { Header } from '../../components/header';
import { Metrics } from '../../components/metrics';
import { ColumnarPage, PageContent } from '../../components/page';
import { WithMetrics } from '../../containers/metrics/with_metrics';
import { WithOptions } from '../../containers/with_options';
import { layouts } from './layouts';

const DetailPageContent = styled(PageContent)`
  overflow: auto;
  background-color: ${props => props.theme.eui.euiColorLightestShade};
`;

interface Props {
  match: {
    params: {
      type: string;
      node: string;
    };
  };
}

export class MetricDetail extends React.PureComponent<Props> {
  public render() {
    const nodeName = this.props.match.params.node;
    const nodeType = this.props.match.params.type as InfraNodeType;
    const layout = layouts[nodeType];
    if (!layout) {
      return (
        <ColumnarPage>
          <Header />
          <DetailPageContent>
            <EuiPage style={{ flex: '1 0 auto' }}>
              <EuiPageBody>
                <EuiPageHeader>
                  <EuiPageHeaderSection>
                    <EuiTitle size="m">
                      <h1>Oops!</h1>
                    </EuiTitle>
                  </EuiPageHeaderSection>
                </EuiPageHeader>
                <EuiPageContent>
                  <EuiCallOut
                    color="danger"
                    title={`"${nodeType}" is not a valid node type`}
                    iconType={'alert'}
                  >
                    <p>
                      The URL you're trying to access is not valid. Please click the back button and
                      try again.
                    </p>
                  </EuiCallOut>
                </EuiPageContent>
              </EuiPageBody>
            </EuiPage>
          </DetailPageContent>
        </ColumnarPage>
      );
    }
    const breadcrumbs = [{ text: nodeName }];
    const sideNav = layout.map(item => {
      return {
        name: item.label,
        id: item.id,
        items: item.sections.map(section => ({
          id: section.id as string,
          name: section.label,
          onClick: this.handleClick(section.id),
        })),
      };
    });
    return (
      <ColumnarPage>
        <Header breadcrumbs={breadcrumbs} />
        <DetailPageContent>
          <WithOptions>
            {({ sourceId, timerange }) => (
              <WithMetrics
                layout={layout}
                sourceId={sourceId}
                timerange={timerange}
                nodeType={nodeType}
                nodeId={nodeName}
              >
                {({ metrics }) => (
                  <EuiPage style={{ flex: '1 0 auto' }}>
                    <EuiPageSideBar>
                      <EuiSideNav items={sideNav} />
                    </EuiPageSideBar>
                    <EuiPageBody>
                      <EuiPageHeader style={{ flex: '0 0 auto' }}>
                        <EuiPageHeaderSection>
                          <EuiTitle size="m">
                            <h1>{nodeName}</h1>
                          </EuiTitle>
                        </EuiPageHeaderSection>
                      </EuiPageHeader>
                      <EuiPageContent>
                        <Metrics layout={layout} metrics={metrics} />
                      </EuiPageContent>
                    </EuiPageBody>
                  </EuiPage>
                )}
              </WithMetrics>
            )}
          </WithOptions>
        </DetailPageContent>
      </ColumnarPage>
    );
  }

  private handleClick = (section: InfraMetric) => () => {
    alert(`Clicked ${section}`);
  };
}
