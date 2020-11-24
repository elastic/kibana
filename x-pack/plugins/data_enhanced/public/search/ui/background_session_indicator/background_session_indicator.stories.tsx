/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { BackgroundSessionIndicator } from './background_session_indicator';
import { BackgroundSessionViewState } from '../connected_background_session_indicator';

storiesOf('components/BackgroundSessionIndicator', module).add('default', () => (
  <>
    <div>
      <BackgroundSessionIndicator state={BackgroundSessionViewState.Loading} />
    </div>
    <div>
      <BackgroundSessionIndicator state={BackgroundSessionViewState.Completed} />
    </div>
    <div>
      <BackgroundSessionIndicator state={BackgroundSessionViewState.BackgroundLoading} />
    </div>
    <div>
      <BackgroundSessionIndicator state={BackgroundSessionViewState.BackgroundCompleted} />
    </div>
    <div>
      <BackgroundSessionIndicator state={BackgroundSessionViewState.Restored} />
    </div>
  </>
));
