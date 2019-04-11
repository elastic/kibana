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
import { GraphQLFormattedError } from 'graphql';
import React from 'react';
import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import euiStyled, { EuiTheme, withTheme } from '../../../../../common/eui_styled_components';
import { InfraMetricsErrorCodes } from '../../../common/errors';
import { AutoSizer } from '../../components/auto_sizer';
import { DocumentTitle } from '../../components/document_title';
import { Header } from '../../components/header';
import { Metrics } from '../../components/metrics';
import { InvalidNodeError } from '../../components/metrics/invalid_node';
import { MetricsSideNav } from '../../components/metrics/side_nav';
import { MetricsTimeControls } from '../../components/metrics/time_controls';
import { ColumnarPage, PageContent } from '../../components/page';
import { SourceConfigurationFlyout } from '../../components/source_configuration';
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
import { MetricDetailPageProviders } from './page_providers';

const DetailPageContent = euiStyled(PageContent)`
  overflow: auto;
  background-color: ${props => props.theme.eui.euiColorLightestShade};
`;

const EuiPageContentWithRelative = euiStyled(EuiPageContent)`
  position: relative;
`;

interface Props {
  theme: EuiTheme;
  match: {
    params: {
      type: string;
      node: string;
    };
  };
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
}

export const MetricDetail = injectUICapabilities(
  withTheme(
    injectI18n(
      class extends React.PureComponent<Props> {
        public static displayName = 'MetricDetailPage';

        public render() {
          const { intl, uiCapabilities } = this.props;
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
            <MetricDetailPageProviders>
              <WithSource>
                {({ sourceId }) => (
                  <WithMetricsTime>
                    {({
                      timeRange,
                      setTimeRange,
                      refreshInterval,
                      setRefreshInterval,
                      isAutoReloading,
                      setAutoReload,
                    }) => (
                      <WithMetadata
                        layouts={layouts}
                        sourceId={sourceId}
                        nodeType={nodeType}
                        nodeId={nodeId}
                      >
                        {({ name, filteredLayouts, loading: metadataLoading }) => {
                          const breadcrumbs = [
                            {
                              href: '#/',
                              text: intl.formatMessage({
                                id: 'xpack.infra.header.infrastructureTitle',
                                defaultMessage: 'Infrastructure',
                              }),
                            },
                            { text: name },
                          ];
                          return (
                            <ColumnarPage>
                              <Header
                                breadcrumbs={breadcrumbs}
                                readOnlyBadge={!uiCapabilities.infrastructure.save}
                              />
                              <SourceConfigurationFlyout
                                shouldAllowEdit={
                                  uiCapabilities.infrastructure.configureSource as boolean
                                }
                              />
                              <WithMetricsTimeUrlState />
                              <DocumentTitle
                                title={intl.formatMessage(
                                  {
                                    id: 'xpack.infra.metricDetailPage.documentTitle',
                                    defaultMessage: 'Infrastructure | Metrics | {name}',
                                  },
                                  {
                                    name,
                                  }
                                )}
                              />
                              <DetailPageContent data-test-subj="infraMetricsPage">
                                <WithMetrics
                                  layouts={filteredLayouts}
                                  sourceId={sourceId}
                                  timerange={timeRange as InfraTimerangeInput}
                                  nodeType={nodeType}
                                  nodeId={nodeId}
                                >
                                  {({ metrics, error, loading, refetch }) => {
                                    if (error) {
                                      const invalidNodeError = error.graphQLErrors.some(
                                        (err: GraphQLFormattedError) =>
                                          err.code === InfraMetricsErrorCodes.invalid_node
                                      );

                                      return (
                                        <>
                                          <DocumentTitle
                                            title={(previousTitle: string) =>
                                              intl.formatMessage(
                                                {
                                                  id:
                                                    'xpack.infra.metricDetailPage.documentTitleError',
                                                  defaultMessage: '{previousTitle} | Uh oh',
                                                },
                                                {
                                                  previousTitle,
                                                }
                                              )
                                            }
                                          />
                                          {invalidNodeError ? (
                                            <InvalidNodeError nodeName={name} />
                                          ) : (
                                            <ErrorPageBody message={error.message} />
                                          )}
                                        </>
                                      );
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
                                                          currentTimeRange={timeRange}
                                                          isLiveStreaming={isAutoReloading}
                                                          refreshInterval={refreshInterval}
                                                          setRefreshInterval={setRefreshInterval}
                                                          onChangeTimeRange={setTimeRange}
                                                          setAutoReload={setAutoReload}
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
                                                      onChangeRangeTime={setTimeRange}
                                                      isLiveStreaming={isAutoReloading}
                                                      stopLiveStreaming={() => setAutoReload(false)}
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
            </MetricDetailPageProviders>
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
  )
);

const MetricsDetailsPageColumn = euiStyled.div`
  flex: 1 0 0%;
  display: flex;
  flex-direction: column;
`;

const MetricsTitleTimeRangeContainer = euiStyled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`;
