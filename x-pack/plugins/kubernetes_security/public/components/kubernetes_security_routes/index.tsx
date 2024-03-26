/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  KUBERNETES_PATH,
  KUBERNETES_TITLE,
  LOCAL_STORAGE_HIDE_WIDGETS_KEY,
  ENTRY_LEADER_INTERACTIVE,
  ENTRY_LEADER_USER_ID,
  ENTRY_LEADER_ENTITY_ID,
  ORCHESTRATOR_CLUSTER_ID,
  ORCHESTRATOR_NAMESPACE,
  ORCHESTRATOR_RESOURCE_ID,
  CONTAINER_IMAGE_NAME,
  CLOUD_INSTANCE_NAME,
  COUNT_WIDGET_KEY_CLUSTERS,
  COUNT_WIDGET_KEY_NAMESPACE,
  COUNT_WIDGET_KEY_NODES,
  COUNT_WIDGET_KEY_CONTAINER_IMAGES,
} from '../../../common/constants';
import { PercentWidget } from '../percent_widget';
import { CountWidget } from '../count_widget';
import { KubernetesSecurityDeps } from '../../types';
import { AggregateResult } from '../../../common/types';
import { useLastUpdated } from '../../hooks';
import { useStyles } from './styles';
import { TreeViewContainer } from '../tree_view_container';
import { ChartsToggle } from '../charts_toggle';
import {
  COUNT_WIDGET_CLUSTERS,
  COUNT_WIDGET_NAMESPACE,
  COUNT_WIDGET_NODES,
  COUNT_WIDGET_PODS,
  COUNT_WIDGET_CONTAINER_IMAGES,
} from '../../../common/translations';
import { ContainerNameWidget } from '../container_name_widget';

const KubernetesSecurityRoutesComponent = ({
  dataViewId,
  filter,
  indexPattern,
  globalFilter,
  renderSessionsView,
}: KubernetesSecurityDeps) => {
  const [shouldHideCharts, setShouldHideCharts] = useLocalStorage(
    LOCAL_STORAGE_HIDE_WIDGETS_KEY,
    false
  );
  const styles = useStyles();
  const lastUpdated = useLastUpdated(globalFilter);
  const onReduceInteractiveAggs = useCallback(
    (result: AggregateResult): Record<string, number> =>
      result.buckets.reduce((groupedByKeyValue, aggregate) => {
        groupedByKeyValue[aggregate.key_as_string || (aggregate.key.toString() as string)] =
          aggregate.count_by_aggs?.value ?? 0;
        return groupedByKeyValue;
      }, {} as Record<string, number>),
    []
  );

  const onReduceRootAggs = useCallback(
    (result: AggregateResult): Record<string, number> =>
      result.buckets.reduce((groupedByKeyValue, aggregate) => {
        if (aggregate.key.toString() === '0') {
          groupedByKeyValue[aggregate.key] = aggregate.count_by_aggs?.value ?? 0;
        } else {
          groupedByKeyValue.nonRoot =
            (groupedByKeyValue.nonRoot || 0) + (aggregate.count_by_aggs?.value ?? 0);
        }
        return groupedByKeyValue;
      }, {} as Record<string, number>),
    []
  );

  const handleToggleHideCharts = useCallback(() => {
    setShouldHideCharts(!shouldHideCharts);
  }, [setShouldHideCharts, shouldHideCharts]);

  return (
    <Routes>
      <Route strict exact path={KUBERNETES_PATH}>
        {filter}
        <EuiFlexGroup gutterSize="none" css={styles.titleSection}>
          <EuiFlexItem>
            <EuiTitle size="l">
              <h1 css={styles.titleText}>{KUBERNETES_TITLE}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={styles.titleActions}>
            <div css={styles.updatedAt}>{lastUpdated}</div>
            <ChartsToggle
              shouldHideCharts={shouldHideCharts}
              handleToggleHideCharts={handleToggleHideCharts}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {!shouldHideCharts && (
          <>
            <EuiFlexGroup css={styles.widgetsGroup}>
              <EuiFlexItem css={styles.leftWidgetsGroup}>
                <EuiFlexGroup css={styles.countWidgetsGroup}>
                  <EuiFlexItem>
                    <CountWidget
                      title={COUNT_WIDGET_CLUSTERS}
                      indexPattern={indexPattern}
                      globalFilter={globalFilter}
                      widgetKey={COUNT_WIDGET_KEY_CLUSTERS}
                      groupedBy={ORCHESTRATOR_CLUSTER_ID}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <CountWidget
                      title={COUNT_WIDGET_NAMESPACE}
                      indexPattern={indexPattern}
                      globalFilter={globalFilter}
                      widgetKey={COUNT_WIDGET_KEY_NAMESPACE}
                      groupedBy={ORCHESTRATOR_NAMESPACE}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <CountWidget
                      title={COUNT_WIDGET_NODES}
                      indexPattern={indexPattern}
                      globalFilter={globalFilter}
                      widgetKey={COUNT_WIDGET_KEY_NODES}
                      groupedBy={CLOUD_INSTANCE_NAME}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <CountWidget
                      title={COUNT_WIDGET_PODS}
                      indexPattern={indexPattern}
                      globalFilter={globalFilter}
                      widgetKey={COUNT_WIDGET_KEY_NODES}
                      groupedBy={ORCHESTRATOR_RESOURCE_ID}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <CountWidget
                      title={COUNT_WIDGET_CONTAINER_IMAGES}
                      indexPattern={indexPattern}
                      globalFilter={globalFilter}
                      widgetKey={COUNT_WIDGET_KEY_CONTAINER_IMAGES}
                      groupedBy={CONTAINER_IMAGE_NAME}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiFlexGroup css={styles.widgetsBottomSpacing}>
                  <EuiFlexItem>
                    <PercentWidget
                      dataViewId={dataViewId}
                      title={
                        <>
                          <EuiText size="xs" css={styles.percentageChartTitle}>
                            <FormattedMessage
                              id="xpack.kubernetesSecurity.sessionChart.title"
                              defaultMessage="Session interactivity"
                            />
                          </EuiText>
                          <EuiIconTip
                            content={
                              <FormattedMessage
                                id="xpack.kubernetesSecurity.sessionChart.tooltip"
                                defaultMessage="Interactive sessions have a controlling terminal and often
                    imply that a human is entering the commands."
                              />
                            }
                          />
                        </>
                      }
                      widgetKey="sessionsPercentage"
                      indexPattern={indexPattern}
                      globalFilter={globalFilter}
                      dataValueMap={{
                        true: {
                          name: i18n.translate(
                            'xpack.kubernetesSecurity.sessionChart.interactive',
                            {
                              defaultMessage: 'Interactive',
                            }
                          ),
                          fieldName: ENTRY_LEADER_INTERACTIVE,
                          color: euiThemeVars.euiColorVis0,
                        },
                        false: {
                          name: i18n.translate(
                            'xpack.kubernetesSecurity.sessionChart.nonInteractive',
                            {
                              defaultMessage: 'Non-interactive',
                            }
                          ),
                          fieldName: ENTRY_LEADER_INTERACTIVE,
                          color: euiThemeVars.euiColorVis1,
                          shouldHideFilter: true,
                        },
                      }}
                      groupedBy={ENTRY_LEADER_INTERACTIVE}
                      countBy={ENTRY_LEADER_ENTITY_ID}
                      onReduce={onReduceInteractiveAggs}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <PercentWidget
                      title={
                        <>
                          <EuiText size="xs" css={styles.percentageChartTitle}>
                            <FormattedMessage
                              id="xpack.kubernetesSecurity.entryUserChart.title"
                              defaultMessage="Entry session users"
                            />
                          </EuiText>
                          <EuiIconTip
                            content={
                              <FormattedMessage
                                id="xpack.kubernetesSecurity.entryUserChart.tooltip"
                                defaultMessage="The entry session user is the initial Linux user associated
                    with the session. This user may be set from authentication of a remote
                    login or automatically for service sessions started by init."
                              />
                            }
                          />
                        </>
                      }
                      widgetKey="rootLoginPercentage"
                      indexPattern={indexPattern}
                      globalFilter={globalFilter}
                      dataValueMap={{
                        '0': {
                          name: i18n.translate('xpack.kubernetesSecurity.entryUserChart.root', {
                            defaultMessage: 'Root',
                          }),
                          fieldName: ENTRY_LEADER_USER_ID,
                          color: euiThemeVars.euiColorVis2,
                        },
                        nonRoot: {
                          name: i18n.translate('xpack.kubernetesSecurity.entryUserChart.nonRoot', {
                            defaultMessage: 'Non-root',
                          }),
                          fieldName: ENTRY_LEADER_USER_ID,
                          color: euiThemeVars.euiColorVis3,
                          shouldHideFilter: true,
                        },
                      }}
                      dataViewId={dataViewId}
                      groupedBy={ENTRY_LEADER_USER_ID}
                      countBy={ENTRY_LEADER_ENTITY_ID}
                      onReduce={onReduceRootAggs}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={styles.rightWidgetsGroup}>
                <ContainerNameWidget
                  dataViewId={dataViewId}
                  widgetKey="containerNameSessions"
                  indexPattern={indexPattern}
                  globalFilter={globalFilter}
                  groupedBy={CONTAINER_IMAGE_NAME}
                  countBy={ENTRY_LEADER_ENTITY_ID}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
        <TreeViewContainer
          globalFilter={globalFilter}
          renderSessionsView={renderSessionsView}
          indexPattern={indexPattern}
        />
      </Route>
    </Routes>
  );
};

export const KubernetesSecurityRoutes = React.memo(KubernetesSecurityRoutesComponent);
// eslint-disable-next-line import/no-default-export
export { KubernetesSecurityRoutes as default };
