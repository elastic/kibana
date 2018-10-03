/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import React from 'react';

import {
  EuiHideFor,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageSideBar,
  EuiShowFor,
  EuiSideNav,
  EuiTitle,
} from '@elastic/eui';
import styled, { withTheme } from 'styled-components';
import { InfraNodeType } from '../../../common/graphql/types';
import { AutoSizer } from '../../components/auto_sizer';
import { Header } from '../../components/header';
import { Metrics } from '../../components/metrics';
import { ColumnarPage, PageContent } from '../../components/page';
import { RangeDatePicker } from '../../components/range_date_picker';
import { WithMetrics } from '../../containers/metrics/with_metrics';
import { WithOptions } from '../../containers/with_options';
import { Error, ErrorPageBody } from '../error';
import { layoutCreators } from './layouts';
import { InfraMetricLayoutSection } from './layouts/types';

const DetailPageContent = styled(PageContent)`
  overflow: auto;
  background-color: ${props => props.theme.eui.euiColorLightestShade};
`;

const EuiPageContentWithRelative = styled(EuiPageContent)`
  position: relative;
`;

interface Props {
  theme: { eui: any };
  match: {
    params: {
      type: string;
      node: string;
    };
  };
}

class MetricDetailPage extends React.PureComponent<Props> {
  public readonly state = {
    isSideNavOpenOnMobile: false,
  };

  public render() {
    const nodeName = this.props.match.params.node;
    const nodeType = this.props.match.params.type as InfraNodeType;
    const layoutCreator = layoutCreators[nodeType];
    if (!layoutCreator) {
      return <Error message={`"${nodeType}" is not a valid node type`} />;
    }
    const layout = layoutCreator(this.props.theme);
    const breadcrumbs = [{ text: nodeName }];
    const sideNav = layout.map(item => {
      return {
        name: item.label,
        id: item.id,
        items: item.sections.map(section => ({
          id: section.id as string,
          name: section.label,
          onClick: this.handleClick(section),
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
                {({ metrics, error, loading }) => {
                  if (error) {
                    return <ErrorPageBody message={error} />;
                  }
                  return (
                    <EuiPage style={{ flex: '1 0 auto' }}>
                      <EuiPageSideBar>
                        <EuiHideFor sizes={['xs', 's']}>
                          <EuiSideNavContainer>
                            <EuiSideNav items={sideNav} />
                          </EuiSideNavContainer>
                        </EuiHideFor>
                        <EuiShowFor sizes={['xs', 's']}>
                          <EuiSideNav
                            items={sideNav}
                            mobileTitle={nodeName}
                            toggleOpenOnMobile={this.toggleOpenOnMobile}
                            isOpenOnMobile={this.state.isSideNavOpenOnMobile}
                          />
                        </EuiShowFor>
                      </EuiPageSideBar>
                      <AutoSizer content={false} bounds detectAnyWindowResize>
                        {({ measureRef, bounds: { width = 0 } }) => {
                          return (
                            <MetricsDetailsPageColumn innerRef={measureRef}>
                              <EuiPageBody style={{ width: `${width}px` }}>
                                <EuiHideFor sizes={['xs', 's']}>
                                  <EuiPageHeader style={{ flex: '0 0 auto' }}>
                                    <EuiPageHeaderSection>
                                      <RangeDatePicker
                                        startDate={moment()}
                                        endDate={moment().add(11, 'd')}
                                      />
                                      <EuiTitle size="m">
                                        <h1>{nodeName}</h1>
                                      </EuiTitle>
                                    </EuiPageHeaderSection>
                                  </EuiPageHeader>
                                </EuiHideFor>
                                <EuiPageContentWithRelative>
                                  <Metrics
                                    nodeName={nodeName}
                                    layout={layout}
                                    metrics={metrics}
                                    loading={loading}
                                  />
                                </EuiPageContentWithRelative>
                              </EuiPageBody>
                            </MetricsDetailsPageColumn>
                          );
                        }}
                      </AutoSizer>
                    </EuiPage>
                  );
                }}
              </WithMetrics>
            )}
          </WithOptions>
        </DetailPageContent>
      </ColumnarPage>
    );
  }

  private handleClick = (section: InfraMetricLayoutSection) => () => {
    const id = section.linkToId || section.id;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView();
    }
  };

  private toggleOpenOnMobile = () => {
    this.setState({
      isSideNavOpenOnMobile: !this.state.isSideNavOpenOnMobile,
    });
  };
}

export const MetricDetail = withTheme(MetricDetailPage);

const EuiSideNavContainer = styled.div`
  position: fixed;
  z-index: 1;
  height: 88vh;
  background-color: #f5f5f5;
  padding-left: 16px;
  margin-left: -16px;
  overflow-y: auto;
  overflow-x: hidden;
`;

const MetricsDetailsPageColumn = styled.div`
  flex: 1 0 0;
  display: flex;
  flex-direction: column;
`;
