/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import * as React from 'react';
import { EuiFlyout, EuiButton } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import { FlyoutFrame } from '.';

storiesOf('components/FlyoutFrame', module)
  .add('default', () => {
    return <FlyoutFrame>test</FlyoutFrame>;
  })
  .add('with title', () => {
    return <FlyoutFrame title="Hello world">test</FlyoutFrame>;
  })
  .add('with onClose', () => {
    return <FlyoutFrame onClose={() => console.log('onClose')}>test</FlyoutFrame>;
  })
  .add('custom footer', () => {
    return <FlyoutFrame footer={<button>click me!</button>}>test</FlyoutFrame>;
  })
  .add('open in flyout', () => {
    return (
      <EuiFlyout>
        <FlyoutFrame
          title="Create drilldown"
          footer={<EuiButton>Save</EuiButton>}
          onClose={() => console.log('onClose')}
        >
          test
        </FlyoutFrame>
      </EuiFlyout>
    );
  });
