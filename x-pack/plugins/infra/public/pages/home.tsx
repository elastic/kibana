/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { InfraHost } from '../../common/types';
import { WaffleMap } from '../components/eui';
import { MainLayout } from '../components/layouts/main';
import { withAllHosts } from '../containers/host';

interface HomePageProps {
  hosts: InfraHost[];
}

export const HomePage = withAllHosts(
  class extends React.PureComponent<HomePageProps> {
    public render() {
      return (
        <MainLayout>
          <WaffleMap hosts={this.props.hosts} />
        </MainLayout>
      );
    }
  }
);
