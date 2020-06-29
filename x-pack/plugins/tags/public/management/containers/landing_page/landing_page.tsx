/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { Page } from '../../components/page';

export const LandingPage: React.FC = () => {
  return (
    <Page
      title={'Tags'}
      subtitle={<p>Organize your visualizations, dashboards and other saved objects using tags.</p>}
      callToAction={
        <EuiButton fill href={'/asdf'}>
          Create a tag
        </EuiButton>
      }
    >
      <div>Hello world</div>
    </Page>
  );
};
