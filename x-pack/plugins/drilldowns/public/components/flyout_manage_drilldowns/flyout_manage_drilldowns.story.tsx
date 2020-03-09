/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import { FlyoutManageDrilldowns } from './flyout_manage_drilldowns';
import { drilldowns } from '../list_manage_drilldowns/test_data';
import {
  dashboardDrilldownActionFactory,
  urlDrilldownActionFactory,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../advanced_ui_actions/public/components/action_wizard/test_data';

storiesOf('components/FlyoutManageDrilldowns', module).add('default', () => (
  <EuiFlyout onClose={() => {}}>
    <FlyoutManageDrilldowns
      drilldowns={drilldowns}
      drilldownActionFactories={[urlDrilldownActionFactory, dashboardDrilldownActionFactory]}
    />
  </EuiFlyout>
));
