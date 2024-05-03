/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import CasesProvider from '../../cases_context';
import { useCasesAddToNewCaseFlyout } from './use_cases_add_to_new_case_flyout';
import { allCasesPermissions } from '../../../common/mock';
import { ExternalReferenceAttachmentTypeRegistry } from '../../../client/attachment_framework/external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from '../../../client/attachment_framework/persistable_state_registry';
import { useIsAddToNewCaseFlyoutOpen } from './use_is_add_to_new_case_flyout_open';
import { act } from 'react-dom/test-utils';

jest.mock('../../../common/use_cases_toast');

const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();

describe('use is add to new case flyout open hook', () => {
  const dispatch = jest.fn();
  let wrapper: FC<PropsWithChildren<unknown>>;
  beforeEach(() => {
    dispatch.mockReset();
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
      useIsAddToNewCaseFlyoutOpen();
    });
    expect(result.error?.message).toContain(
      'useCasesContext must be used within a CasesProvider and have a defined value'
    );
  });

  it('should return open flyout status', () => {
    const { result } = renderHook(
      () => {
        return { flyout: useCasesAddToNewCaseFlyout(), isOpen: useIsAddToNewCaseFlyoutOpen() };
      },
      { wrapper }
    );

    expect(result.current.isOpen).toEqual(false);

    act(() => {
      result.current.flyout.open();
    });

    expect(result.current.isOpen).toEqual(true);
  });
});
