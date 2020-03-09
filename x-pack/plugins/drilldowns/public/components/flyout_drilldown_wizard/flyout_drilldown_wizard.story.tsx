/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import * as React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import { FlyoutDrilldownWizard } from '.';
import {
  urlDrilldownActionFactory,
  dashboardDrilldownActionFactory,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../advanced_ui_actions/public/components/action_wizard/test_data';

storiesOf('components/FlyoutDrilldownWizard', module)
  .add('default', () => {
    return (
      <FlyoutDrilldownWizard
        drilldownActionFactories={[urlDrilldownActionFactory, dashboardDrilldownActionFactory]}
      />
    );
  })
  .add('open in flyout - create', () => {
    return (
      <EuiFlyout onClose={() => {}}>
        <FlyoutDrilldownWizard
          onClose={() => {}}
          drilldownActionFactories={[urlDrilldownActionFactory, dashboardDrilldownActionFactory]}
        />
      </EuiFlyout>
    );
  })
  .add('open in flyout - edit', () => {
    return (
      <EuiFlyout onClose={() => {}}>
        <FlyoutDrilldownWizard
          onClose={() => {}}
          drilldownActionFactories={[urlDrilldownActionFactory, dashboardDrilldownActionFactory]}
          initialDrilldownWizardConfig={{
            name: 'My fancy drilldown',
            actionFactory: urlDrilldownActionFactory,
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
