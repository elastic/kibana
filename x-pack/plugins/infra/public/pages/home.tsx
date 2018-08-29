/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MainLayout } from '../components/layouts/main';
import { Waffle } from '../components/waffle';
import { withMap } from '../containers/map';
import { withOptions } from '../containers/with_options';
import { InfraOptions, InfraWaffleMapGroup } from '../lib/lib';

interface HomePageProps {
  map: InfraWaffleMapGroup[];
  options: InfraOptions;
}

export const HomePage = withOptions(
  withMap(
    class extends React.PureComponent<HomePageProps> {
      public render() {
        return (
          <MainLayout>
            <Waffle map={this.props.map} options={this.props.options.wafflemap} />
          </MainLayout>
        );
      }
    }
  )
);
