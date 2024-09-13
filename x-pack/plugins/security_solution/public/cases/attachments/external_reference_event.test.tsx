/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import AttachmentContentEvent from './external_reference_event';
import { useNavigation } from '@kbn/security-solution-navigation/src/navigation';

jest.mock('@kbn/security-solution-navigation/src/navigation', () => {
  return {
    useNavigation: jest.fn(),
  };
});

describe('AttachmentContentEvent', () => {
  const mockNavigateTo = jest.fn();

  const mockUseNavigation = useNavigation as jest.Mocked<typeof useNavigation>;
  (mockUseNavigation as jest.Mock).mockReturnValue({
    getAppUrl: jest.fn(),
    navigateTo: mockNavigateTo,
  });

  const defaultProps = {
    externalReferenceMetadata: {
      command: 'isolate',
      comment: 'test comment',
      targets: [
        {
          endpointId: 'endpoint-1',
          hostname: 'host-1',
          agentType: 'endpoint' as const,
        },
      ],
    },
  };

  it('renders the expected text based on the command', () => {
    const { getByText, getByTestId, rerender } = render(
      <AttachmentContentEvent {...defaultProps} />
    );

    expect(getByText('submitted isolate request on host')).toBeInTheDocument();
    expect(getByTestId('actions-link-endpoint-1')).toHaveTextContent('host-1');

    rerender(
      <AttachmentContentEvent
        {...defaultProps}
        externalReferenceMetadata={{
          ...defaultProps.externalReferenceMetadata,
          command: 'unisolate',
        }}
      />
    );

    expect(getByText('submitted release request on host')).toBeInTheDocument();
    expect(getByTestId('actions-link-endpoint-1')).toHaveTextContent('host-1');
  });

  it('navigates on link click', () => {
    const { getByTestId } = render(<AttachmentContentEvent {...defaultProps} />);

    fireEvent.click(getByTestId('actions-link-endpoint-1'));

    expect(mockNavigateTo).toHaveBeenCalled();
  });

  it('builds endpoint details URL correctly', () => {
    const mockGetAppUrl = jest.fn().mockReturnValue('http://app.url');
    (mockUseNavigation as jest.Mock).mockReturnValue({
      getAppUrl: mockGetAppUrl,
    });

    render(<AttachmentContentEvent {...defaultProps} />);

    expect(mockGetAppUrl).toHaveBeenNthCalledWith(1, {
      path: '/administration/endpoints?selected_endpoint=endpoint-1&show=activity_log',
    });
    expect(mockGetAppUrl).toHaveBeenNthCalledWith(2, {
      path: '/hosts/name/host-1',
    });
  });
});
