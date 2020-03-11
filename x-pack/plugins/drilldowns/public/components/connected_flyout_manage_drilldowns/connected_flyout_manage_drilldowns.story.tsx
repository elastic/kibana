/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import { createFlyoutManageDrilldowns } from './connected_flyout_manage_drilldowns';
import {
  dashboardFactory,
  urlFactory,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../advanced_ui_actions/public/components/action_wizard/test_data';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';
import { StubBrowserStorage } from '../../../../../../src/test_utils/public/stub_browser_storage';

const FlyoutManageDrilldowns = createFlyoutManageDrilldowns({
  advancedUiActions: {
    actionFactory: {
      getAll: () => {
        return [dashboardFactory, urlFactory];
      },
    },
  } as any,
  storage: new Storage(new StubBrowserStorage()),
});

storiesOf('components/FlyoutManageDrilldowns', module).add('default', () => (
  <EuiFlyout onClose={() => {}}>
    <FlyoutManageDrilldowns context={{}} />
  </EuiFlyout>
));
