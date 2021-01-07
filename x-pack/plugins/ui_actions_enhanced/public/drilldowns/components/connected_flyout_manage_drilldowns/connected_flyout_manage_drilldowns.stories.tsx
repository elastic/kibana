/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import { StubBrowserStorage } from '@kbn/test/jest';
import { createFlyoutManageDrilldowns } from './connected_flyout_manage_drilldowns';
import { mockActionFactories } from '../../../components/action_wizard/test_data';
import { Storage } from '../../../../../../../src/plugins/kibana_utils/public';
import { mockDynamicActionManager } from './test_data';

const FlyoutManageDrilldowns = createFlyoutManageDrilldowns({
  actionFactories: mockActionFactories,
  storage: new Storage(new StubBrowserStorage()),
  toastService: {
    addError: (...args: any[]) => {
      alert(JSON.stringify(args));
    },
    addSuccess: (...args: any[]) => {
      alert(JSON.stringify(args));
    },
  } as any,
  getTrigger: (triggerId) => ({
    id: triggerId,
  }),
});

storiesOf('components/FlyoutManageDrilldowns', module)
  .add('default (3 triggers)', () => (
    <EuiFlyout onClose={() => {}}>
      <FlyoutManageDrilldowns
        dynamicActionManager={mockDynamicActionManager}
        triggers={['VALUE_CLICK_TRIGGER', 'SELECT_RANGE_TRIGGER', 'FILTER_TRIGGER']}
      />
    </EuiFlyout>
  ))
  .add('Only filter is supported', () => (
    <EuiFlyout onClose={() => {}}>
      <FlyoutManageDrilldowns
        dynamicActionManager={mockDynamicActionManager}
        triggers={['FILTER_TRIGGER']}
      />
    </EuiFlyout>
  ));
