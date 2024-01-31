/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import AttachmentContent from './external_reference_event';
import { useNavigation } from '@kbn/security-solution-navigation/src/navigation';

jest.mock('@kbn/security-solution-navigation/src/navigation', () => {
  return {
    useNavigation: jest.fn(),
  };
});

describe('AttachmentContent', () => {
  const mockNavigateTo = jest.fn();

  const mockUseNavigation = useNavigation as jest.Mocked<typeof useNavigation>;
  mockUseNavigation.mockReturnValue({
    getAppUrl: jest.fn(),
    navigateTo: mockNavigateTo,
  });

  const defaultProps = {
    externalReferenceMetadata: {
      command: 'isolate',
      targets: [
        {
          endpointId: 'endpoint-1',
          hostname: 'host-1',
          type: 'endpoint',
        },
      ],
    },
  };

  it('renders the expected text based on the command', () => {
    const component = shallow(<AttachmentContent {...defaultProps} />);

    expect(component.text()).toContain('submitted isolate request on host host-1');

    component.setProps({
      externalReferenceMetadata: {
        ...defaultProps.externalReferenceMetadata,
        command: 'unisolate',
      },
    });

    expect(component.text()).toContain('submitted release request on host host-1');
  });

  it('navigates on link click', () => {
    const component = shallow(<AttachmentContent {...defaultProps} />);

    component.find('EuiLink').simulate('click', {
      preventDefault: jest.fn(),
    });

    expect(mockNavigateTo).toHaveBeenCalled();
  });
});
