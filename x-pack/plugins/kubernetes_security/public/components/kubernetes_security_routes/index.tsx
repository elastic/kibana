/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTextColor } from '@elastic/eui';
import { CSSObject } from '@emotion/react';
import { KUBERNETES_PATH } from '../../../common/constants';
import { KubernetesWidget } from '../kubernetes_widget';
import { KubernetesSecurityDeps } from '../../types';
import { TreeView } from '../tree_view';

const widgetBadge: CSSObject = {
  position: 'absolute',
  bottom: '16px',
  left: '16px',
  width: 'calc(100% - 32px)',
  fontSize: '12px',
  lineHeight: '18px',
  padding: '4px 8px',
  display: 'flex',
};

const KubernetesSecurityRoutesComponent = ({ filter }: KubernetesSecurityDeps) => {
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
                  ...widgetBadge,
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
              <EuiBadge css={{ ...widgetBadge, justifyContent: 'center' }}>
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
        <TreeView />
      </Route>
    </Switch>
  );
};

export const KubernetesSecurityRoutes = React.memo(KubernetesSecurityRoutesComponent);
// eslint-disable-next-line import/no-default-export
export { KubernetesSecurityRoutes as default };
