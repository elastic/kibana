/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Page } from '../../components/page';
import { EndpointsCardShowcase } from '../endpoints/enpoints_card';

const cards = [EndpointsCardShowcase];

export class LandingPage extends PureComponent {
  render() {
    return (
      <Page>
        <EuiFlexGroup>
          {cards.map((Card, index) => (
            <EuiFlexItem key={String(index)} grow={false}>
              <Card />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </Page>
    );
  }
}
