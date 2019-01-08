/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { ReindexStatus, ReindexStep } from '../../../../../../common/types';
import { LoadingState } from '../../../../types';
import { ReindexFlyoutUI } from './flyout';

describe('ReindexFlyout', () => {
  const defaultProps = {
    indexName: 'myIndex',
    closeFlyout: jest.fn(),
    startReindex: jest.fn(),
    reindexState: {
      loadingState: LoadingState.Success,
      lastCompletedSte: ReindexStep.readonly,
      status: ReindexStatus.inProgress,
      reindexTaskPercComplete: null,
      errorMessage: null,
    },
  };

  it('renders', () => {
    expect(shallow(<ReindexFlyoutUI {...defaultProps} />)).toMatchSnapshot();
  });

  it('disables button while reindexing', () => {
    const wrapper = shallow(<ReindexFlyoutUI {...defaultProps} />);
    expect(wrapper.find('EuiButton').props().disabled).toBe(true);
  });

  it('calls startReindex when button is clicked', () => {
    const props = {
      ...defaultProps,
      reindexState: {
        ...defaultProps.reindexState,
        lastCompletedStep: undefined,
        status: undefined,
      },
    };
    const wrapper = shallow(<ReindexFlyoutUI {...props} />);

    wrapper.find('EuiButton').simulate('click');
    expect(props.startReindex).toHaveBeenCalled();
  });
});
