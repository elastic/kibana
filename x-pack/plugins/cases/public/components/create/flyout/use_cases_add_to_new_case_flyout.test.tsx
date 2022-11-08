/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import { alertComment } from '../../../containers/mock';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { CasesContext } from '../../cases_context';
import { CasesContextStoreActionsList } from '../../cases_context/cases_context_reducer';
import { useCasesAddToNewCaseFlyout } from './use_cases_add_to_new_case_flyout';
import { allCasesPermissions } from '../../../common/mock';
import { ExternalReferenceAttachmentTypeRegistry } from '../../../client/attachment_framework/external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from '../../../client/attachment_framework/persistable_state_registry';

jest.mock('../../../common/use_cases_toast');

const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();

describe('use cases add to new case flyout hook', () => {
  const dispatch = jest.fn();
  let wrapper: React.FC;
  beforeEach(() => {
    dispatch.mockReset();
    wrapper = ({ children }) => {
      return (
        <CasesContext.Provider
          value={{
            externalReferenceAttachmentTypeRegistry,
            persistableStateAttachmentTypeRegistry,
            owner: ['test'],
            permissions: allCasesPermissions(),
            appId: 'test',
            appTitle: 'jest',
            basePath: '/jest',
            dispatch,
            features: { alerts: { sync: true, enabled: true, isExperimental: false }, metrics: [] },
            releasePhase: 'ga',
          }}
        >
          {children}
        </CasesContext.Provider>
      );
    };
  });

  it('should throw if called outside of a cases context', () => {
    const { result } = renderHook(() => {
      useCasesAddToNewCaseFlyout();
    });
    expect(result.error?.message).toContain(
      'useCasesContext must be used within a CasesProvider and have a defined value'
    );
  });

  it('should dispatch the open action when invoked without attachments', () => {
    const { result } = renderHook(
      () => {
        return useCasesAddToNewCaseFlyout();
      },
      { wrapper }
    );
    result.current.open();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CasesContextStoreActionsList.OPEN_CREATE_CASE_FLYOUT,
        payload: expect.objectContaining({
          attachments: undefined,
        }),
      })
    );
  });

  it('should dispatch the open action when invoked with attachments', () => {
    const { result } = renderHook(
      () => {
        return useCasesAddToNewCaseFlyout();
      },
      { wrapper }
    );
    result.current.open({ attachments: [alertComment] });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CasesContextStoreActionsList.OPEN_CREATE_CASE_FLYOUT,
        payload: expect.objectContaining({
          attachments: [alertComment],
        }),
      })
    );
  });

  it('should dispatch the close action when invoked', () => {
    const { result } = renderHook(
      () => {
        return useCasesAddToNewCaseFlyout();
      },
      { wrapper }
    );
    result.current.close();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CasesContextStoreActionsList.CLOSE_CREATE_CASE_FLYOUT,
      })
    );
  });
});
