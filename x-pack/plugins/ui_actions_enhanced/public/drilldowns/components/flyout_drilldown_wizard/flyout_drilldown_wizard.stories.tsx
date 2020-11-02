/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import { FlyoutDrilldownWizard } from './index';
import { mockActionFactories } from '../../../components/action_wizard/test_data';
import { Trigger, TriggerId } from '../../../../../../../src/plugins/ui_actions/public';

const otherProps = {
  supportedTriggers: [
    'VALUE_CLICK_TRIGGER',
    'SELECT_RANGE_TRIGGER',
    'FILTER_TRIGGER',
  ] as TriggerId[],
  onClose: () => {},
  getTrigger: (id: TriggerId) => ({ id } as Trigger),
};

storiesOf('components/FlyoutDrilldownWizard', module)
  .add('default', () => {
    return <FlyoutDrilldownWizard drilldownActionFactories={mockActionFactories} {...otherProps} />;
  })
  .add('open in flyout - create', () => {
    return (
      <EuiFlyout onClose={() => {}}>
        <FlyoutDrilldownWizard drilldownActionFactories={mockActionFactories} {...otherProps} />
      </EuiFlyout>
    );
  })
  .add('open in flyout - edit', () => {
    return (
      <EuiFlyout onClose={() => {}}>
        <FlyoutDrilldownWizard
          drilldownActionFactories={mockActionFactories}
          initialDrilldownWizardConfig={{
            name: 'My fancy drilldown',
            actionFactory: mockActionFactories[1],
            actionConfig: {
              url: 'https://elastic.co',
              openInNewTab: true,
            },
          }}
          mode={'edit'}
          {...otherProps}
        />
      </EuiFlyout>
    );
  })
  .add('open in flyout - edit, just 1 action type', () => {
    return (
      <EuiFlyout onClose={() => {}}>
        <FlyoutDrilldownWizard
          drilldownActionFactories={[mockActionFactories[1]]}
          initialDrilldownWizardConfig={{
            name: 'My fancy drilldown',
            actionFactory: mockActionFactories[1],
            actionConfig: {
              url: 'https://elastic.co',
              openInNewTab: true,
            },
          }}
          mode={'edit'}
          {...otherProps}
        />
      </EuiFlyout>
    );
  });
