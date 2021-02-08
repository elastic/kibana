/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { SearchSessionIndicator } from './search_session_indicator';
import { SearchSessionState } from '../../../../../../../src/plugins/data/public';

storiesOf('components/SearchSessionIndicator', module).add('default', () => (
  <>
    <div>
      <SearchSessionIndicator state={SearchSessionState.Loading} />
    </div>
    <div>
      <SearchSessionIndicator state={SearchSessionState.Completed} />
    </div>
    <div>
      <SearchSessionIndicator state={SearchSessionState.BackgroundLoading} />
    </div>
    <div>
      <SearchSessionIndicator state={SearchSessionState.BackgroundCompleted} />
    </div>
    <div>
      <SearchSessionIndicator state={SearchSessionState.Restored} />
    </div>
    <div>
      <SearchSessionIndicator state={SearchSessionState.Canceled} />
    </div>
    <div>
      <SearchSessionIndicator
        state={SearchSessionState.Completed}
        saveDisabled={true}
        saveDisabledReasonText={
          'Search results have expired and it is no longer possible to save this search session'
        }
      />
    </div>
  </>
));
