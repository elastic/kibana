/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCard, EuiFlexGrid, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { ID } from '../common/constants';

const relativeHashPath = (path: string) => `${ID}#${path}`;
const getDetailPageUrl = ({ name, version }) => relativeHashPath(`/detail/${name}-${version}`);

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
      <EuiFlexGrid gutterSize="l" columns={3}>
        {listResponse.map(props => (
          <EuiFlexItem>
            <IntegrationCard {...props} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </EuiPanel>
  );
};

const IntegrationCard = ({ description, name, version, icon }) => (
  <EuiCard
    title={name}
    // { 'how to do a relative link to page/view?' }
    href={getDetailPageUrl({ name, version })}
    description={description}
    footer={`Version ${version}`}
    selectable={{
      isSelected: false,
      onClick: () => {},
    }}
  />
);

const Detail = ({ match }) => {
  const isDetail = ({ name, version }) => `${name}-${version}` === match.params.pkgkey;
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
  { exact: true, path: '/', component: Home, breadcrumb: 'Home' },
  {
    exact: true,
    path: '/detail/:pkgkey',
    component: Detail,
    breadcrumb: 'Example Other Page',
  },
];
