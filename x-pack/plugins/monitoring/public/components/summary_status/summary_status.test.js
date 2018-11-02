/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl } from '../../../../../test_utils/enzyme_helpers';
import { SummaryStatus } from './summary_status';

describe('Summary Status Component', () => {
  it('should render metrics in a summary bar', () => {
    const props = {
      metrics: [
        {
          label: 'Free Disk Space',
          value: '173.9 GB',
          dataTestSubj: 'freeDiskSpace'
        },
        {
          label: 'Documents',
          value: '24.8k',
          dataTestSubj: 'documentCount'
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
          dataTestSubj: 'transportAddress'
        },
        {
          label: 'Documents',
          value: '24.8k',
          dataTestSubj: 'documentCount'
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
          dataTestSubj: 'freeDiskSpace'
        },
        {
          label: 'Documents',
          value: '24.8k',
          dataTestSubj: 'documentCount'
        },
      ]
    };

    expect(renderWithIntl(<SummaryStatus {...props} />)).toMatchSnapshot();
  });
});
