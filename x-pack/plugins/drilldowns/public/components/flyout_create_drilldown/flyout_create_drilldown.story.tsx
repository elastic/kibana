/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import * as React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import { FlyoutCreateDrilldown } from '.';

storiesOf('components/FlyoutCreateDrilldown', module)
  .add('default', () => {
    return <FlyoutCreateDrilldown context={{} as any} />;
  })
  .add('open in flyout', () => {
    return (
      <EuiFlyout>
        <FlyoutCreateDrilldown context={{} as any} />
      </EuiFlyout>
    );
  });
