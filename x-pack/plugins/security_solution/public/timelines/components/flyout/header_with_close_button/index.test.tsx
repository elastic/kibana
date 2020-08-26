/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { TimelineType } from '../../../../../common/types/timeline';
import { TestProviders } from '../../../../common/mock';
import '../../../../common/mock/match_media';
import { FlyoutHeaderWithCloseButton } from '.';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: jest.fn(),
  };
});
jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');

  return {
    ...original,
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          capabilities: {
            siem: {
              crud: true,
            },
          },
        },
      },
    }),
    useUiSetting$: jest.fn().mockReturnValue([]),
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});

describe('FlyoutHeaderWithCloseButton', () => {
  const props = {
    onClose: jest.fn(),
    timelineId: 'test',
    timelineType: TimelineType.default,
    usersViewing: ['elastic'],
  };
  test('renders correctly against snapshot', () => {
    const EmptyComponent = shallow(
      <TestProviders>
        <FlyoutHeaderWithCloseButton {...props} />
      </TestProviders>
    );
    expect(EmptyComponent.find('FlyoutHeaderWithCloseButton')).toMatchSnapshot();
  });

  test('it should invoke onClose when the close button is clicked', () => {
    const closeMock = jest.fn();
    const testProps = {
      ...props,
      onClose: closeMock,
    };
    const wrapper = mount(
      <TestProviders>
        <FlyoutHeaderWithCloseButton {...testProps} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="close-timeline"] button').first().simulate('click');

    expect(closeMock).toBeCalled();
  });
});
