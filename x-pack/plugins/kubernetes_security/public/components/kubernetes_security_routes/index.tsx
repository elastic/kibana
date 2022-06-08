/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLoadingContent,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiThemeVars } from '@kbn/ui-theme';
import { KUBERNETES_PATH } from '../../../common/constants';
import { KubernetesWidget } from '../kubernetes_widget';
import { PercentCompareWidget } from '../percent_compare_widget';
import { KubernetesSecurityDeps } from '../../types';
import { useStyles } from './styles';

const KubernetesSecurityRoutesComponent = ({ filter }: KubernetesSecurityDeps) => {
  const styles = useStyles();
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
            <PercentCompareWidget
              title={
                <>
                  <EuiText size="xs" css={styles.percentageChartTitle}>
                    <FormattedMessage
                      id="xpack.kubernetesSecurity.sessionsChart.title"
                      defaultMessage="Sessions"
                    />
                  </EuiText>
                  <EuiIconTip content="Sessions icon tip placeholder" />
                </>
              }
              data={[
                {
                  name: 'Interactive',
                  value: 280,
                  fieldName: 'process.entry_leader.interactive',
                  fieldValue: true,
                  color: euiThemeVars.euiColorVis0,
                },
                {
                  name: 'Non-interactive',
                  value: 780,
                  fieldName: 'process.entry_leader.interactive',
                  fieldValue: false,
                  color: euiThemeVars.euiColorVis1,
                },
              ]}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <PercentCompareWidget
              title={
                <>
                  <EuiText size="xs" css={styles.percentageChartTitle}>
                    <FormattedMessage
                      id="xpack.kubernetesSecurity.userLoginChart.title"
                      defaultMessage="Sessions with login root users"
                    />
                  </EuiText>
                  <EuiIconTip content="Sessions login root icon tip placeholder" />
                </>
              }
              data={[
                {
                  name: 'Root',
                  value: 480,
                  fieldName: 'process.entry_leader.interactive',
                  fieldValue: true,
                  color: euiThemeVars.euiColorVis2,
                },
                {
                  name: 'Non-root',
                  value: 780,
                  fieldName: 'process.entry_leader.interactive',
                  fieldValue: false,
                  color: euiThemeVars.euiColorVis3,
                },
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <div css={styles.treeViewContainer}>
          <EuiLoadingContent lines={3} />
          <EuiLoadingContent lines={3} />
        </div>
      </Route>
    </Switch>
  );
};

export const KubernetesSecurityRoutes = React.memo(KubernetesSecurityRoutesComponent);
// eslint-disable-next-line import/no-default-export
export { KubernetesSecurityRoutes as default };
