/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, withRouter, RouteComponentProps } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { EuiPageTemplate, EuiSideNav } from '@elastic/eui';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import { AppMountParameters, CoreStart, IUiSettingsClient, OverlayStart } from '@kbn/core/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { SampleChart } from './sample_chart';
import { ChartEditor } from './editor';

interface PageDef {
  title: string;
  id: string;
  component: React.ReactNode;
}

type NavProps = RouteComponentProps & {
  navigateToApp: CoreStart['application']['navigateToApp'];
  pages: PageDef[];
};

const Nav = withRouter(({ history, navigateToApp, pages }: NavProps) => {
  const navItems = pages.map((page) => ({
    id: page.id,
    name: page.title,
    onClick: () => history.push(`/${page.id}`),
    'data-test-subj': page.id,
  }));

  return (
    <EuiSideNav
      items={[
        {
          name: 'Embeddable examples',
          id: 'home',
          items: [...navItems],
        },
      ]}
    />
  );
});

interface Props {
  basename: string;
  navigateToApp: CoreStart['application']['navigateToApp'];
  embeddableApi: EmbeddableStart;
  lensApi: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
  overlays: OverlayStart;
  notifications: CoreStart['notifications'];
  inspector: InspectorStartContract;
  uiSettingsClient: IUiSettingsClient;
}

const EmbeddableExplorerApp = ({ basename, navigateToApp, lensApi, dataViews }: Props) => {
  const pages: PageDef[] = [
    {
      title: 'sample chart',
      id: 'helloWorldEmbeddableSection',
      component: <SampleChart lens={lensApi} dataViews={dataViews} />,
    },
    {
      title: 'chart with editor',
      id: 'listContainerSection',
      component: <ChartEditor lens={lensApi} dataViews={dataViews} />,
    },
  ];

  const routes = pages.map((page, i) => (
    <Route key={i} path={`/${page.id}`} render={(props) => page.component} />
  ));

  return (
    <Router basename={basename}>
      <EuiPageTemplate offset={0}>
        <EuiPageTemplate.Sidebar>
          <Nav navigateToApp={navigateToApp} pages={pages} />
        </EuiPageTemplate.Sidebar>
        {routes}
      </EuiPageTemplate>
    </Router>
  );
};

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<EmbeddableExplorerApp {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
