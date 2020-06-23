/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { FormDrilldownWizard } from './index';

const DemoEditName: React.FC = () => {
  const [name, setName] = React.useState('');

  return (
    <>
      <FormDrilldownWizard name={name} onNameChange={setName} actionFactoryContext={{}} />{' '}
      <div>name: {name}</div>
    </>
  );
};

storiesOf('components/FormDrilldownWizard', module)
  .add('default', () => {
    return <FormDrilldownWizard actionFactoryContext={{}} />;
  })
  .add('[name=foobar]', () => {
    return <FormDrilldownWizard name={'foobar'} actionFactoryContext={{}} />;
  })
  .add('can edit name', () => <DemoEditName />);
