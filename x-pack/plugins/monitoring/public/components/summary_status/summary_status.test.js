/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl } from '../../../../../test_utils/enzyme_helpers';
import { SummaryStatus } from './summary_status';
jest.mock(`@elastic/eui/lib/components/form/form_row/make_id`, () => () => `generated-id`);

describe('Summary Status Component', () => {
  it('should render metrics in a summary bar', () => {
    const props = {
      metrics: [
        {
          label: 'Free Disk Space',
          value: '173.9 GB',
          'data-test-subj': 'freeDiskSpace'
        },
        {
          label: 'Documents',
          value: '24.8k',
          'data-test-subj': 'documentCount'
        },
      ],
      status: 'green'
    };

    expect(renderWithIntl(<SummaryStatus {...props} />)).toMatchSnapshot();
  });

  it('should allow label to be optional', () => {
    const props = {
      metrics: [
        {
          value: '127.0.0.1:9300',
          'data-test-subj': 'transportAddress'
        },
        {
          label: 'Documents',
          value: '24.8k',
          'data-test-subj': 'documentCount'
        },
      ],
      status: 'yellow'
    };

    expect(renderWithIntl(<SummaryStatus {...props} />)).toMatchSnapshot();
  });

  it('should allow status to be optional', () => {
    const props = {
      metrics: [
        {
          label: 'Free Disk Space',
          value: '173.9 GB',
          'data-test-subj': 'freeDiskSpace'
        },
        {
          label: 'Documents',
          value: '24.8k',
          'data-test-subj': 'documentCount'
        },
      ]
    };

    expect(renderWithIntl(<SummaryStatus {...props} />)).toMatchSnapshot();
  });
});
