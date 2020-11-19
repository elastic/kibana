/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import '../../../common/mock/match_media';
import { TestProviders } from '../../../common/mock';
import { ONE_MILLISECOND_AS_NANOSECONDS } from '../formatted_duration/helpers';
import { useMountAppended } from '../../../common/utils/use_mount_appended';

import { Duration } from '.';

describe('Duration', () => {
  const mount = useMountAppended();

  test('it renders the expected formatted duration', () => {
    const wrapper = mount(
      <TestProviders>
        <Duration
          contextId="test"
          eventId="abc"
          fieldName="event.duration"
          value={`${ONE_MILLISECOND_AS_NANOSECONDS}`}
        />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="formatted-duration"]').first().text()).toEqual('1ms');
  });
});
