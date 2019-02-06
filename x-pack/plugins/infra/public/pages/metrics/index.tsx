/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHideFor,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import styled, { withTheme } from 'styled-components';

import { AutoSizer } from '../../components/auto_sizer';
import { InfrastructureBetaBadgeHeaderSection } from '../../components/beta_badge_header_section';
import { Header } from '../../components/header';
import { Metrics } from '../../components/metrics';
import { MetricsSideNav } from '../../components/metrics/side_nav';
import { MetricsTimeControls } from '../../components/metrics/time_controls';
import { ColumnarPage, PageContent } from '../../components/page';
import { WithMetadata } from '../../containers/metadata/with_metadata';
import { WithMetrics } from '../../containers/metrics/with_metrics';
import {
  WithMetricsTime,
  WithMetricsTimeUrlState,
} from '../../containers/metrics/with_metrics_time';
import { WithSource } from '../../containers/with_source';
import { InfraNodeType, InfraTimerangeInput } from '../../graphql/types';
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
  intl: InjectedIntl;
}

export const MetricDetail = withTheme(
  injectI18n(
    class extends React.PureComponent<Props> {
      public static displayName = 'MetricDetailPage';

      public render() {
        const { intl } = this.props;
        const nodeId = this.props.match.params.node;
        const nodeType = this.props.match.params.type as InfraNodeType;
        const layoutCreator = layoutCreators[nodeType];
        if (!layoutCreator) {
          return (
            <Error
              message={intl.formatMessage(
                {
                  id: 'xpack.infra.metricDetailPage.invalidNodeTypeErrorMessage',
                  defaultMessage: '{nodeType} is not a valid node type',
                },
                {
                  nodeType: `"${nodeType}"`,
                }
              )}
            />
          );
        }
        const layouts = layoutCreator(this.props.theme);

        return (
          <WithSource>
            {({ sourceId }) => (
              <WithMetricsTime resetOnUnmount>
                {({
                  currentTimeRange,
                  isAutoReloading,
                  setRangeTime,
                  startMetricsAutoReload,
                  stopMetricsAutoReload,
                }) => (
                  <WithMetadata
                    layouts={layouts}
                    sourceId={sourceId}
                    nodeType={nodeType}
                    nodeId={nodeId}
                  >
                    {({ name, filteredLayouts, loading: metadataLoading }) => {
                      const breadcrumbs = [{ text: name }];
                      return (
                        <ColumnarPage>
                          <Header
                            appendSections={<InfrastructureBetaBadgeHeaderSection />}
                            breadcrumbs={breadcrumbs}
                          />
                          <WithMetricsTimeUrlState />
                          <DetailPageContent>
                            <WithMetrics
                              layouts={filteredLayouts}
                              sourceId={sourceId}
                              timerange={currentTimeRange as InfraTimerangeInput}
                              nodeType={nodeType}
                              nodeId={nodeId}
                            >
                              {({ metrics, error, loading, refetch }) => {
                                if (error) {
                                  return <ErrorPageBody message={error} />;
                                }
                                return (
                                  <EuiPage style={{ flex: '1 0 auto' }}>
                                    <MetricsSideNav
                                      layouts={filteredLayouts}
                                      loading={metadataLoading}
                                      nodeName={name}
                                      handleClick={this.handleClick}
                                    />
                                    <AutoSizer content={false} bounds detectAnyWindowResize>
                                      {({ measureRef, bounds: { width = 0 } }) => {
                                        return (
                                          <MetricsDetailsPageColumn innerRef={measureRef}>
                                            <EuiPageBody style={{ width: `${width}px` }}>
                                              <EuiPageHeader style={{ flex: '0 0 auto' }}>
                                                <EuiPageHeaderSection style={{ width: '100%' }}>
                                                  <MetricsTitleTimeRangeContainer>
                                                    <EuiHideFor sizes={['xs', 's']}>
                                                      <EuiTitle size="m">
                                                        <h1>{name}</h1>
                                                      </EuiTitle>
                                                    </EuiHideFor>
                                                    <MetricsTimeControls
                                                      currentTimeRange={currentTimeRange}
                                                      isLiveStreaming={isAutoReloading}
                                                      onChangeRangeTime={setRangeTime}
                                                      startLiveStreaming={startMetricsAutoReload}
                                                      stopLiveStreaming={stopMetricsAutoReload}
                                                    />
                                                  </MetricsTitleTimeRangeContainer>
                                                </EuiPageHeaderSection>
                                              </EuiPageHeader>

                                              <EuiPageContentWithRelative>
                                                <Metrics
                                                  label={name}
                                                  nodeId={nodeId}
                                                  layouts={filteredLayouts}
                                                  metrics={metrics}
                                                  loading={
                                                    metrics.length > 0 && isAutoReloading
                                                      ? false
                                                      : loading
                                                  }
                                                  refetch={refetch}
                                                  onChangeRangeTime={setRangeTime}
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
                          </DetailPageContent>
                        </ColumnarPage>
                      );
                    }}
                  </WithMetadata>
                )}
              </WithMetricsTime>
            )}
          </WithSource>
        );
      }

      private handleClick = (section: InfraMetricLayoutSection) => () => {
        const id = section.linkToId || section.id;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView();
        }
      };
    }
  )
);

const MetricsDetailsPageColumn = styled.div`
  flex: 1 0 0%;
  display: flex;
  flex-direction: column;
`;

const MetricsTitleTimeRangeContainer = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`;
