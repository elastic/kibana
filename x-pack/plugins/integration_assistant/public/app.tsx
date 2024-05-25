/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters } from '@kbn/core/public';
import {
  EuiPageTemplate,
  EuiPageSection,
  EuiText,
  EuiHorizontalRule,
  EuiListGroup,
} from '@elastic/eui';
import { Services } from './services';

type Props = Services;

function RoutingExplorer({
  runEcsGraph,
  runCategorizationGraph,
  runRelatedGraph,
  runIntegrationBuilder,
}: Props) {
  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header>
        <EuiText>
          <h1>Routing examples</h1>
        </EuiText>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        <EuiPageSection>
          <EuiText>
            <h2>Run ECS graph</h2>
          </EuiText>
          <EuiHorizontalRule />
          <EuiListGroup
            listItems={[
              {
                label: 'Run ECS graph',
                onClick: () => runEcsGraph(),
              },
            ]}
          />
        </EuiPageSection>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<RoutingExplorer {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
