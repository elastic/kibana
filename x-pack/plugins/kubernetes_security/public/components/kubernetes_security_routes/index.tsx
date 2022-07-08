/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Route, Switch } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  KUBERNETES_PATH,
  ENTRY_LEADER_INTERACTIVE,
  ENTRY_LEADER_USER_ID,
  ENTRY_LEADER_ENTITY_ID,
} from '../../../common/constants';
import { PercentWidget } from '../percent_widget';
import { CountWidget } from '../count_widget';
import { KubernetesSecurityDeps } from '../../types';
import { AggregateResult } from '../../../common/types/aggregate';
import { useStyles } from './styles';
import { TreeViewContainer } from '../tree_view_container';

const KubernetesSecurityRoutesComponent = ({
  filter,
  indexPattern,
  globalFilter,
  renderSessionsView,
}: KubernetesSecurityDeps) => {
  const styles = useStyles();

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

  return (
    <Switch>
      <Route strict exact path={KUBERNETES_PATH}>
        {filter}
        <EuiFlexGroup>
          <EuiFlexItem>
            <CountWidget
              title="Clusters"
              indexPattern={indexPattern}
              globalFilter={globalFilter}
              widgetKey="CountClustersWidget"
              groupedBy={'orchestrator.cluster.id'}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <CountWidget
              title="Namespace"
              indexPattern={indexPattern}
              globalFilter={globalFilter}
              widgetKey="CountNamespaceWidgets"
              groupedBy={'orchestrator.namespace'}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <CountWidget
              title="Nodes"
              indexPattern={indexPattern}
              globalFilter={globalFilter}
              widgetKey="CountNodesWidgets"
              groupedBy={'orchestrator.resource.id'}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <CountWidget
              title="Pods"
              indexPattern={indexPattern}
              globalFilter={globalFilter}
              widgetKey="CountPodsWidgets"
              groupedBy={'orchestrator.resource.id'}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <CountWidget
              title="Container Images"
              indexPattern={indexPattern}
              globalFilter={globalFilter}
              widgetKey="CountContainerImagesWidgets"
              groupedBy={'container.image.name'}
            />
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
        <TreeViewContainer globalFilter={globalFilter} renderSessionsView={renderSessionsView} />
      </Route>
    </Switch>
  );
};

export const KubernetesSecurityRoutes = React.memo(KubernetesSecurityRoutesComponent);
// eslint-disable-next-line import/no-default-export
export { KubernetesSecurityRoutes as default };
