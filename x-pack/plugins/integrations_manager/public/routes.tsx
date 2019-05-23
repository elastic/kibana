/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { generatePath, Link } from 'react-router-dom';
import { APP } from '../common/constants';

interface IntegrationInfo {
  description: string;
  name: string;
  version: string;
  icon: string;
}

interface IntegrationKeySettings {
  name: string;
  version: string;
}

interface MatchPackage {
  match: {
    params: {
      pkgkey: string;
    };
  };
}

// TODO: figure how to call Intgerations Manager API (which does fetch or return local/cached)
// TODO: deal with async data issue (no data -> fetch -> show data)
const listResponse = [
  {
    description: 'This is the envoyproxy integration.',
    icon: '/img/envoyproxy-0.0.2.png',
    name: 'envoyproxy',
    version: '0.0.2',
  },
  {
    description: 'This is the envoyproxy integration with improved features.',
    icon: '/img/envoyproxy-0.0.5.png',
    name: 'envoyproxy',
    version: '0.0.5',
  },
];

const Home = () => {
  return (
    <EuiPanel>
      <EuiTitle>
        <h1>Elastic Integrations Manager</h1>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGrid gutterSize="l" columns={3}>
        {listResponse.map(props => (
          <EuiFlexItem key={`${props.name}-${props.version}`}>
            <IntegrationCard {...props} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </EuiPanel>
  );
};

const IntegrationCard = ({ description, name, version, icon }: IntegrationInfo) => (
  <EuiCard
    title={name}
    description={description}
    footer={
      <EuiButtonEmpty>
        <Link to={generatePath(APP.DETAIL_VIEW, { pkgkey: `${name}-${version}` })}>
          More Details
        </Link>
      </EuiButtonEmpty>
    }
  />
);

const Detail = ({ match }: MatchPackage) => {
  const isDetail = ({ name, version }: IntegrationKeySettings) =>
    `${name}-${version}` === match.params.pkgkey;
  const detail = listResponse.filter(isDetail)[0];
  const { description, name, version, icon } = detail;

  return (
    <EuiPanel>
      <EuiTitle>
        <h2>{`${name} (v${version})`}</h2>
      </EuiTitle>
      <p>{description}</p>
    </EuiPanel>
  );
};

export const routes = [
  { exact: true, path: APP.LIST_VIEW, component: Home, breadcrumb: 'Home' },
  {
    exact: true,
    path: APP.DETAIL_VIEW,
    component: Detail,
    breadcrumb: 'Example Other Page',
  },
];
