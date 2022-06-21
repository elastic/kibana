/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Route, Switch } from 'react-router-dom';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  KUBERNETES_PATH,
  ENTRY_LEADER_INTERACTIVE,
  ENTRY_LEADER_USER_ID,
  ENTRY_LEADER_ENTITY_ID,
} from '../../../common/constants';
import { KubernetesWidget } from '../kubernetes_widget';
import { PercentWidget } from '../percent_widget';
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
                      id="xpack.kubernetesSecurity.sessionsChart.title"
                      defaultMessage="Sessions"
                    />
                  </EuiText>
                  <EuiIconTip
                    content={
                      <FormattedMessage
                        id="xpack.kubernetesSecurity.sessionsChart.tooltip"
                        defaultMessage="Sessions icon tip placeholder"
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
                  name: i18n.translate('xpack.kubernetesSecurity.sessionsChart.interactive', {
                    defaultMessage: 'Interactive',
                  }),
                  fieldName: ENTRY_LEADER_INTERACTIVE,
                  color: euiThemeVars.euiColorVis0,
                },
                false: {
                  name: i18n.translate('xpack.kubernetesSecurity.sessionsChart.nonInteractive', {
                    defaultMessage: 'Non-interactive',
                  }),
                  fieldName: ENTRY_LEADER_INTERACTIVE,
                  color: euiThemeVars.euiColorVis1,
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
                      id="xpack.kubernetesSecurity.userLoginChart.title"
                      defaultMessage="Sessions with entry root users"
                    />
                  </EuiText>
                  <EuiIconTip
                    content={
                      <FormattedMessage
                        id="xpack.kubernetesSecurity.userLoginChart.tooltip"
                        defaultMessage="Sessions with entry root users icon tip placeholder"
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
                  name: i18n.translate('xpack.kubernetesSecurity.userLoginChart.root', {
                    defaultMessage: 'Root',
                  }),
                  fieldName: ENTRY_LEADER_USER_ID,
                  color: euiThemeVars.euiColorVis2,
                },
                nonRoot: {
                  name: i18n.translate('xpack.kubernetesSecurity.userLoginChart.nonRoot', {
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
