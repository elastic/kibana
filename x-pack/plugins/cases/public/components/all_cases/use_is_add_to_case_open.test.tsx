/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { useKibana } from '../../common/lib/kibana';
import CasesProvider from '../cases_context';
import { useCasesAddToExistingCaseModal } from './selector_modal/use_cases_add_to_existing_case_modal';
import { allCasesPermissions } from '../../common/mock';
import { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';
import { useIsAddToCaseOpen } from './use_is_add_to_case_open';
import { act } from 'react-dom/test-utils';
import { useApplication } from '../../common/lib/kibana/use_application';
import { of } from 'rxjs';
import { useCasesToast } from '../../common/use_cases_toast';
import type { PublicAppInfo } from '@kbn/core/public';

jest.mock('../../common/use_cases_toast');
jest.mock('../../common/lib/kibana');
jest.mock('../../common/lib/kibana/use_application');
jest.mock('../../common/use_cases_toast');

const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const useApplicationMock = useApplication as jest.Mock;
const useCasesToastMock = useCasesToast as jest.Mock;
const mockedToastInfo = jest.fn();

describe('use is add to existing case modal open hook', () => {
  let wrapper: FC<PropsWithChildren<unknown>>;
  beforeEach(() => {
    jest.clearAllMocks();

    useKibanaMock().services.application = {
      ...useKibanaMock().services.application,
      currentAppId$: of('securitySolutionUI'),
      applications$: of(
        new Map([
          ['securitySolutionUI', { category: { label: 'Test' } } as unknown as PublicAppInfo],
        ])
      ),
    };
    useApplicationMock.mockReturnValue({ appId: 'testAppId' });
    useCasesToastMock.mockReturnValue({
      showInfoToast: mockedToastInfo,
    });

    wrapper = ({ children }) => {
      return (
        <CasesProvider
          value={{
            externalReferenceAttachmentTypeRegistry,
            persistableStateAttachmentTypeRegistry,
            owner: ['cases'],
            permissions: allCasesPermissions(),
            basePath: '/jest',
            features: { alerts: { sync: true, enabled: true, isExperimental: false }, metrics: [] },
            releasePhase: 'ga',
            getFilesClient: jest.fn(),
          }}
        >
          {children}
        </CasesProvider>
      );
    };
  });

  it('should throw if called outside of a cases context', () => {
    const { result } = renderHook(() => {
      useIsAddToCaseOpen();
    });
    expect(result.error?.message).toContain(
      'useCasesContext must be used within a CasesProvider and have a defined value'
    );
  });

  it('should return open modal status', () => {
    const { result } = renderHook(
      () => {
        return {
          modal: useCasesAddToExistingCaseModal(),
          isOpen: useIsAddToCaseOpen(),
        };
      },
      { wrapper }
    );

    expect(result.current.isOpen).toEqual(false);

    act(() => {
      result.current.modal.open();
    });

    expect(result.current.isOpen).toEqual(true);
  });
});
