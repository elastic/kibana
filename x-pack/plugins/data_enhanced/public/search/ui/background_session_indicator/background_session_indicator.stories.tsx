/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { BackgroundSessionIndicator } from './background_session_indicator';
import { SessionState } from '../../../../../../../src/plugins/data/public';

storiesOf('components/BackgroundSessionIndicator', module).add('default', () => (
  <>
    <div>
      <BackgroundSessionIndicator state={SessionState.Loading} />
    </div>
    <div>
      <BackgroundSessionIndicator state={SessionState.Completed} />
    </div>
    <div>
      <BackgroundSessionIndicator state={SessionState.BackgroundLoading} />
    </div>
    <div>
      <BackgroundSessionIndicator state={SessionState.BackgroundCompleted} />
    </div>
    <div>
      <BackgroundSessionIndicator state={SessionState.Restored} />
    </div>
  </>
));
