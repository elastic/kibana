/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Route, Switch } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
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
} from '../../../common/constants';
import { KubernetesWidget } from '../kubernetes_widget';
import { PercentWidget } from '../percent_widget';
import { KubernetesSecurityDeps } from '../../types';
import { AggregateResult } from '../../../common/types/aggregate';
import { useLastUpdated } from '../../hooks';
import { useStyles } from './styles';
import { TreeViewContainer } from '../tree_view_container';
import { ChartsToggle } from '../charts_toggle';

const KubernetesSecurityRoutesComponent = ({
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
    (result: AggregateResult[]): Record<string, number> =>
      result.reduce((groupedByKeyValue, aggregate) => {
        groupedByKeyValue[aggregate.key_as_string || (aggregate.key.toString() as string)] =
          aggregate.count_by_aggs.value;
        return groupedByKeyValue;
      }, {} as Record<string, number>),
    []
  );

  const onReduceRootAggs = useCallback(
    (result: AggregateResult[]): Record<string, number> =>
      result.reduce((groupedByKeyValue, aggregate) => {
        if (aggregate.key === '0') {
          groupedByKeyValue[aggregate.key] = aggregate.count_by_aggs.value;
        } else {
          groupedByKeyValue.nonRoot =
            (groupedByKeyValue.nonRoot || 0) + aggregate.count_by_aggs.value;
        }
        return groupedByKeyValue;
      }, {} as Record<string, number>),
    []
  );

  const handleToggleHideCharts = useCallback(() => {
    setShouldHideCharts(!shouldHideCharts);
  }, [setShouldHideCharts, shouldHideCharts]);

  return (
    <Switch>
      <Route strict exact path={KUBERNETES_PATH}>
        {filter}
        <EuiFlexGroup gutterSize="none" css={styles.titleSection}>
          <EuiFlexItem>
            <EuiTitle size="l">
              <h1>{KUBERNETES_TITLE}</h1>
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
            <EuiFlexGroup>
              <EuiFlexItem>
                <KubernetesWidget
                  title="Clusters"
                  icon="heatmap"
                  iconColor="success"
                  data={4}
                  isAlert={true}
                >
                  <EuiBadge
                    color="danger"
                    href="#"
                    target="blank"
                    css={{
                      ...styles.widgetBadge,
                      '.euiBadge__content': {
                        width: '100%',
                        '.euiBadge__text': {
                          display: 'flex',
                          justifyContent: 'space-between',
                        },
                      },
                    }}
                  >
                    <div>{'93 alerts '}</div>View alerts
                  </EuiBadge>
                </KubernetesWidget>
              </EuiFlexItem>
              <EuiFlexItem>
                <KubernetesWidget title="Nodes" icon="node" iconColor="#9170B8" data={16} />
              </EuiFlexItem>
              <EuiFlexItem>
                <KubernetesWidget title="Pods" icon="package" iconColor="warning" data={775}>
                  <EuiBadge css={{ ...styles.widgetBadge, justifyContent: 'center' }}>
                    <EuiTextColor css={{ marginRight: '16px' }} color="success">
                      <span css={{ fontWeight: 700 }}>1000</span>
                      {' live'}
                    </EuiTextColor>
                    <span css={{ fontWeight: 700 }}>42</span>
                    {' disabled'}
                  </EuiBadge>
                </KubernetesWidget>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexGroup css={styles.percentageWidgets}>
              <EuiFlexItem>
                <PercentWidget
                  title={
                    <>
                      <EuiText size="xs" css={styles.percentageChartTitle}>
                        <FormattedMessage
                          id="xpack.kubernetesSecurity.sessionChart.title"
                          defaultMessage="Session Interactivity"
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
                      name: i18n.translate('xpack.kubernetesSecurity.sessionChart.interactive', {
                        defaultMessage: 'Interactive',
                      }),
                      fieldName: ENTRY_LEADER_INTERACTIVE,
                      color: euiThemeVars.euiColorVis0,
                    },
                    false: {
                      name: i18n.translate('xpack.kubernetesSecurity.sessionChart.nonInteractive', {
                        defaultMessage: 'Non-interactive',
                      }),
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
                          defaultMessage="Session Entry Users"
                        />
                      </EuiText>
                      <EuiIconTip
                        content={
                          <FormattedMessage
                            id="xpack.kubernetesSecurity.entryUserChart.tooltip"
                            defaultMessage="The session user is the initial Linux user associated
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
                  groupedBy={ENTRY_LEADER_USER_ID}
                  countBy={ENTRY_LEADER_ENTITY_ID}
                  onReduce={onReduceRootAggs}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
        <TreeViewContainer globalFilter={globalFilter} renderSessionsView={renderSessionsView} />
      </Route>
    </Switch>
  );
};

export const KubernetesSecurityRoutes = React.memo(KubernetesSecurityRoutesComponent);
// eslint-disable-next-line import/no-default-export
export { KubernetesSecurityRoutes as default };
