/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../__mocks__/kea.mock';
import '../../__mocks__/shallow_useeffect.mock';

import { setMockActions, setMockValues } from '../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiPanel } from '@elastic/eui';

import { IndexingStatusContent } from './indexing_status_content';
import { IndexingStatusErrors } from './indexing_status_errors';
import { IndexingStatus } from './indexing_status';

describe('IndexingStatus', () => {
  const getItemDetailPath = jest.fn();
  const onComplete = jest.fn();
  const setGlobalIndexingStatus = jest.fn();
  const fetchIndexingStatus = jest.fn();

  const props = {
    percentageComplete: 50,
    numDocumentsWithErrors: 1,
    activeReindexJobId: 12,
    viewLinkPath: '/path',
    statusPath: '/other_path',
    itemId: '1',
    getItemDetailPath,
    onComplete,
    setGlobalIndexingStatus,
  };

  beforeEach(() => {
    setMockActions({ fetchIndexingStatus });
  });

  it('renders', () => {
    setMockValues({
      percentageComplete: 50,
      numDocumentsWithErrors: 0,
    });
    const wrapper = shallow(<IndexingStatus {...props} />);

    expect(wrapper.find(EuiPanel)).toHaveLength(1);
    expect(wrapper.find(IndexingStatusContent)).toHaveLength(1);
    expect(fetchIndexingStatus).toHaveBeenCalled();
  });

  it('renders errors', () => {
    setMockValues({
      percentageComplete: 100,
      numDocumentsWithErrors: 1,
    });
    const wrapper = shallow(<IndexingStatus {...props} />);

    expect(wrapper.find(IndexingStatusErrors)).toHaveLength(1);
  });
});
