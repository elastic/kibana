/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiPanel } from '@elastic/eui';

import { IndexingStatusContent } from './indexing_status_content';
import { IndexingStatusErrors } from './indexing_status_errors';
import { IndexingStatusFetcher } from './indexing_status_fetcher';
import { IndexingStatus } from './indexing_status';

describe('IndexingStatus', () => {
  const getItemDetailPath = jest.fn();
  const getStatusPath = jest.fn();
  const onComplete = jest.fn();
  const setGlobalIndexingStatus = jest.fn();

  const props = {
    percentageComplete: 50,
    numDocumentsWithErrors: 1,
    activeReindexJobId: 12,
    viewLinkPath: '/path',
    itemId: '1',
    getItemDetailPath,
    getStatusPath,
    onComplete,
    setGlobalIndexingStatus,
  };

  it('renders', () => {
    const wrapper = shallow(<IndexingStatus {...props} />);
    const fetcher = wrapper.find(IndexingStatusFetcher).prop('children')(
      props.percentageComplete,
      props.numDocumentsWithErrors
    );

    expect(shallow(fetcher).find(EuiPanel)).toHaveLength(1);
    expect(shallow(fetcher).find(IndexingStatusContent)).toHaveLength(1);
  });

  it('renders errors', () => {
    const wrapper = shallow(<IndexingStatus {...props} percentageComplete={100} />);
    const fetcher = wrapper.find(IndexingStatusFetcher).prop('children')(100, 1);
    expect(shallow(fetcher).find(IndexingStatusErrors)).toHaveLength(1);
  });
});
