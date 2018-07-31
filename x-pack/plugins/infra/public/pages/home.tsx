/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { InfraResponse } from '../../common/graphql/types';
import { WaffleMap } from '../components/eui';
import { MainLayout } from '../components/layouts/main';
import { withMap } from '../containers/map';

interface HomePageProps {
  map: InfraResponse;
}

export const HomePage = withMap(
  class extends React.PureComponent<HomePageProps> {
    public render() {
      return (
        <MainLayout>
          <WaffleMap map={this.props.map} />
        </MainLayout>
      );
    }
  }
);
