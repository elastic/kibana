/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import * as React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import { FlyoutDrilldownWizard } from './index';
import {
  dashboardFactory,
  urlFactory,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../components/action_wizard/test_data';
import { ActionFactory } from '../../../dynamic_actions';

storiesOf('components/FlyoutDrilldownWizard', module)
  .add('default', () => {
    return (
      <FlyoutDrilldownWizard
        drilldownActionFactories={[urlFactory as ActionFactory, dashboardFactory as ActionFactory]}
      />
    );
  })
  .add('open in flyout - create', () => {
    return (
      <EuiFlyout onClose={() => {}}>
        <FlyoutDrilldownWizard
          onClose={() => {}}
          drilldownActionFactories={[
            urlFactory as ActionFactory,
            dashboardFactory as ActionFactory,
          ]}
        />
      </EuiFlyout>
    );
  })
  .add('open in flyout - edit', () => {
    return (
      <EuiFlyout onClose={() => {}}>
        <FlyoutDrilldownWizard
          onClose={() => {}}
          drilldownActionFactories={[
            urlFactory as ActionFactory,
            dashboardFactory as ActionFactory,
          ]}
          initialDrilldownWizardConfig={{
            name: 'My fancy drilldown',
            actionFactory: urlFactory as any,
            actionConfig: {
              url: 'https://elastic.co',
              openInNewTab: true,
            },
          }}
          mode={'edit'}
        />
      </EuiFlyout>
    );
  })
  .add('open in flyout - edit, just 1 action type', () => {
    return (
      <EuiFlyout onClose={() => {}}>
        <FlyoutDrilldownWizard
          onClose={() => {}}
          drilldownActionFactories={[dashboardFactory as ActionFactory]}
          initialDrilldownWizardConfig={{
            name: 'My fancy drilldown',
            actionFactory: urlFactory as any,
            actionConfig: {
              url: 'https://elastic.co',
              openInNewTab: true,
            },
          }}
          mode={'edit'}
        />
      </EuiFlyout>
    );
  });
