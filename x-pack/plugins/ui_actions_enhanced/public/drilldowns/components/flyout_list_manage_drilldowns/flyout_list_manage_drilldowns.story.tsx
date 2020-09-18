/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import { FlyoutListManageDrilldowns } from './flyout_list_manage_drilldowns';

storiesOf('components/FlyoutListManageDrilldowns', module).add('default', () => (
  <EuiFlyout onClose={() => {}}>
    <FlyoutListManageDrilldowns
      drilldowns={[
        { id: '1', actionName: 'Dashboard', drilldownName: 'Drilldown 1' },
        { id: '2', actionName: 'Dashboard', drilldownName: 'Drilldown 2' },
        { id: '3', actionName: 'Dashboard', drilldownName: 'Drilldown 3', error: 'Some error...' },
      ]}
    />
  </EuiFlyout>
));
