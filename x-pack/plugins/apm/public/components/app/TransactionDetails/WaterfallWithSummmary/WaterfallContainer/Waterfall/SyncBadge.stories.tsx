/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { SyncBadge } from './SyncBadge';

storiesOf('app/TransactionDetails/SyncBadge', module)
  .add(
    'sync=true',
    () => {
      return <SyncBadge sync={true} />;
    },
    {
      info: {
        source: false,
      },
    }
  )
  .add(
    'sync=false',
    () => {
      return <SyncBadge sync={false} />;
    },
    {
      info: {
        source: false,
      },
    }
  )
  .add(
    'sync=undefined',
    () => {
      return <SyncBadge />;
    },
    {
      info: {
        source: false,
      },
    }
  );
