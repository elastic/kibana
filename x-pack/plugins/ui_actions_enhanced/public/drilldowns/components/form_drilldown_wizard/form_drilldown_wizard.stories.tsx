/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { FormDrilldownWizard } from './index';
import { Trigger, TriggerId } from '../../../../../../../src/plugins/ui_actions/public';

const otherProps = {
  triggers: ['VALUE_CLICK_TRIGGER', 'SELECT_RANGE_TRIGGER', 'FILTER_TRIGGER'] as TriggerId[],
  getTriggerInfo: (id: TriggerId) => ({ id } as Trigger),
  onSelectedTriggersChange: () => {},
  actionFactoryContext: { triggers: [] as TriggerId[] },
};

const DemoEditName: React.FC = () => {
  const [name, setName] = React.useState('');

  return (
    <>
      <FormDrilldownWizard name={name} onNameChange={setName} {...otherProps} />{' '}
      <div>name: {name}</div>
    </>
  );
};

storiesOf('components/FormDrilldownWizard', module)
  .add('default', () => {
    return <FormDrilldownWizard {...otherProps} />;
  })
  .add('[name=foobar]', () => {
    return <FormDrilldownWizard name={'foobar'} {...otherProps} />;
  })
  .add('can edit name', () => <DemoEditName />);
