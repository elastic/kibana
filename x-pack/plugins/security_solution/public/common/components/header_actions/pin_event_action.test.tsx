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
import { TimelineType } from '../../../../common/api/timeline';

jest.mock('../user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('PinEventAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('timeline is saved', () => {
    it('should disable the pin event button when the user does NOT have crud privileges', () => {
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
            isTimelineSaved={true}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('pin')).toBeDisabled();
    });

    it('should enable the pin event button when the user has crud privileges', () => {
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
            isTimelineSaved={true}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('pin')).not.toBeDisabled();
    });
  });

  describe('timeline is not saved', () => {
    it('should disable the pin event button when the user has crud privileges', () => {
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
            isTimelineSaved={false}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('pin')).toBeDisabled();
    });
  });

  describe('is timeline template', () => {
    it('should disable the pin event button when the user has crud privileges and the timeline is saved', () => {
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
            timelineType={TimelineType.template}
            isTimelineSaved={true}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('pin')).toBeDisabled();
    });
  });
});
