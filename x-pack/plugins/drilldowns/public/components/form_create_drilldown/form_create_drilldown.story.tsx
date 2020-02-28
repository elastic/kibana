/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import * as React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import { FormCreateDrilldown } from '.';

const DemoEditName: React.FC = () => {
  const [name, setName] = React.useState('');

  return <FormCreateDrilldown name={name} onNameChange={setName} />;
};

storiesOf('components/FormCreateDrilldown', module)
  .add('default', () => {
    return <FormCreateDrilldown />;
  })
  .add('[name=foobar]', () => {
    return <FormCreateDrilldown name={'foobar'} />;
  })
  .add('can edit name', () => <DemoEditName />)
  .add('open in flyout', () => {
    return (
      <EuiFlyout>
        <FormCreateDrilldown />
      </EuiFlyout>
    );
  });
