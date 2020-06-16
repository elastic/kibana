/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { FlyoutHeaderWithCloseButton } from '.';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn(),
}));
jest.mock('../../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../../common/lib/kibana'),
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
}));

describe('FlyoutHeaderWithCloseButton', () => {
  test('renders correctly against snapshot', () => {
    const EmptyComponent = shallow(
      <TestProviders>
        <FlyoutHeaderWithCloseButton
          onClose={jest.fn()}
          timelineId={'test'}
          usersViewing={['elastic']}
        />
      </TestProviders>
    );
    expect(EmptyComponent.find('FlyoutHeaderWithCloseButton')).toMatchSnapshot();
  });

  test('it should invoke onClose when the close button is clicked', () => {
    const closeMock = jest.fn();
    const wrapper = mount(
      <TestProviders>
        <FlyoutHeaderWithCloseButton
          onClose={closeMock}
          timelineId={'test'}
          usersViewing={['elastic']}
        />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="close-timeline"] button').first().simulate('click');

    expect(closeMock).toBeCalled();
  });
});
