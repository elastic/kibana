/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { PinEventAction } from './pin_event_action';
import { useUserPrivileges } from '../user_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../user_privileges/endpoint/mocks';
import { TestProviders } from '../../mock';
import { TimelineType } from '../../../../common/types';

jest.mock('../user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('PinEventAction', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('isDisabled', () => {
    test('it disables the pin event button when the user does NOT have crud privileges', () => {
      useUserPrivilegesMock.mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: false, read: true },
        endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
      });

      render(
        <TestProviders>
          <PinEventAction
            isAlert={false}
            noteIds={[]}
            onPinClicked={jest.fn}
            eventIsPinned={false}
            timelineType={TimelineType.default}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('pin')).toHaveProperty('disabled', true);
    });

    test('it enables the pin event button when the user has crud privileges', () => {
      useUserPrivilegesMock.mockReturnValue({
        kibanaSecuritySolutionsPrivileges: { crud: true, read: true },
        endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
      });

      render(
        <TestProviders>
          <PinEventAction
            isAlert={false}
            noteIds={[]}
            onPinClicked={jest.fn}
            eventIsPinned={false}
            timelineType={TimelineType.default}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('pin')).not.toHaveClass('euiButtonIcon-isDisabled');
    });
  });
});
