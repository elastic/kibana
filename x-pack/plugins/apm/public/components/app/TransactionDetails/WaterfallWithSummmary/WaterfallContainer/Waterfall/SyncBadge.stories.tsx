/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boolean, withKnobs } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { SyncBadge } from './SyncBadge';

storiesOf('app/TransactionDetails/SyncBadge', module)
  .addDecorator(withKnobs)
  .add(
    'example',
    () => {
      return <SyncBadge sync={boolean('sync', true)} />;
    },
    {
      showPanel: true,
      info: { source: false },
    }
  )
  .add(
    'sync=undefined',
    () => {
      return <SyncBadge />;
    },
    { info: { source: false } }
  );
