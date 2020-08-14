/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import '../../../../../../common/mock/match_media';
import { TestProviders } from '../../../../../../common/mock';
import { mockBrowserFields } from '../../../../../../common/containers/source/mock';
import { mockEndgameDnsRequest } from '../../../../../../common/mock/mock_endgame_ecs_data';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';

import { DnsRequestEventDetails } from './dns_request_event_details';

describe('DnsRequestEventDetails', () => {
  const mount = useMountAppended();

  test('it renders the expected text given an Endgame DNS request_event', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetails
          browserFields={mockBrowserFields}
          contextId="test-context"
          data={mockEndgameDnsRequest}
          timelineId="timeline-id-test"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'SYSTEM\\NT AUTHORITY@HD-obe-8bf77f54asked forupdate.googleapis.comwith question typeA, which resolved to10.100.197.67viaGoogleUpdate.exe(443192)3008dns'
    );
  });
});
