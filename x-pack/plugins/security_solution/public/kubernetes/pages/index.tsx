/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/jsx-no-literals */

import React, { ReactNode } from 'react';
import { Route, Switch } from 'react-router-dom';
import { EuiBadge, EuiIcon, EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';
import { CSSObject } from '@emotion/react';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { KUBERNETES_PATH, SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SiemSearchBar } from '../../common/components/search_bar';
import { showGlobalFilters } from '../../timelines/components/timeline/helpers';
import { useGlobalFullScreen } from '../../common/containers/use_full_screen';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { SourcererScopeName } from '../../common/store/sourcerer/model';

const widget = (isAlert?: boolean): CSSObject => ({
  position: 'relative',
  height: '180px',
  padding: '16px',
  border: `1px solid ${isAlert ? '#BD271E' : '#D3DAE6'}`,
  borderRadius: '6px',
  fontWeight: 700,
  fontSize: '12px',
  lineHeight: '16px',
});

const widgetData: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  marginTop: '16px',
  fontSize: '27px',
  lineHeight: '32px',
};

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

interface KubernetesWidgetDeps {
  title: string;
  icon: string;
  iconColor: string;
  data: number;
  isAlert?: boolean;
  children?: ReactNode;
}

const KubernetesWidget = ({
  title,
  icon,
  iconColor,
  data,
  isAlert,
  children,
}: KubernetesWidgetDeps) => (
  <div css={widget(isAlert)}>
    <div>{title}</div>
    <div css={widgetData}>
      <EuiIcon css={{ marginRight: '8px' }} type={icon} size="l" color={iconColor} />
      {data}
    </div>
    {children}
  </div>
);

export const KubernetesContainer = React.memo(() => {
  const { globalFullScreen } = useGlobalFullScreen();
  const {
    indexPattern,
    // runtimeMappings,
    // loading: isLoadingIndexPattern,
  } = useSourcererDataView(SourcererScopeName.detections);

  return (
    <SecuritySolutionPageWrapper noPadding>
      <Switch>
        <Route strict exact path={KUBERNETES_PATH}>
          <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId: undefined })}>
            <SiemSearchBar id="global" indexPattern={indexPattern} />
          </FiltersGlobal>
          <EuiFlexGroup>
            <EuiFlexItem grow={3}>
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
            <EuiFlexItem grow={3}>
              <KubernetesWidget title="Nodes" icon="node" iconColor="#9170B8" data={16} />
            </EuiFlexItem>
            <EuiFlexItem grow={3}>
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
            <EuiFlexItem grow={5}>Alerts</EuiFlexItem>
          </EuiFlexGroup>
        </Route>
      </Switch>
      <SpyRoute pageName={SecurityPageName.kubernetes} />
    </SecuritySolutionPageWrapper>
  );
});

KubernetesContainer.displayName = 'KubernetesContainer';
