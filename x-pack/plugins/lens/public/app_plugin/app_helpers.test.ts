/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import faker from 'faker';
import { UseNavigateBackToAppProps, useNavigateBackToApp } from './app_helpers';
import { defaultDoc, makeDefaultServices } from '../mocks/services_mock';
import { cloneDeep } from 'lodash';
import { LensDocument } from '../persistence';

function getLensDocumentMock(someProps?: Partial<LensDocument>) {
  return cloneDeep({ ...defaultDoc, ...someProps });
}

const getApplicationMock = () => makeDefaultServices().application;

describe('App helpers', () => {
  function getDefaultProps(
    someProps?: Partial<UseNavigateBackToAppProps>
  ): UseNavigateBackToAppProps {
    return {
      application: getApplicationMock(),
      onAppLeave: jest.fn(),
      legacyEditorAppName: faker.lorem.word(),
      legacyEditorAppUrl: faker.internet.url(),
      isLensEqual: jest.fn(() => true),
      initialDocFromContext: undefined,
      persistedDoc: getLensDocumentMock(),
      ...someProps,
    };
  }
  describe('useNavigateBackToApp', () => {
    it('navigates back to originating app if documents has not changed', () => {
      const props = getDefaultProps();
      const { result } = renderHook(() => useNavigateBackToApp(props));

      act(() => {
        result.current.goBackToOriginatingApp();
      });

      expect(props.application.navigateToApp).toHaveBeenCalledWith(props.legacyEditorAppName, {
        path: props.legacyEditorAppUrl,
      });
    });

    it('shows modal if documents are not equal', () => {
      const props = getDefaultProps({ isLensEqual: jest.fn().mockReturnValue(false) });
      const { result } = renderHook(() => useNavigateBackToApp(props));

      act(() => {
        result.current.goBackToOriginatingApp();
      });

      expect(props.application.navigateToApp).not.toHaveBeenCalled();
      expect(result.current.shouldShowGoBackToVizEditorModal).toBe(true);
    });

    it('navigateToVizEditor hides modal and navigates back to Viz editor', () => {
      const props = getDefaultProps();
      const { result } = renderHook(() => useNavigateBackToApp(props));

      act(() => {
        result.current.navigateToVizEditor();
      });

      expect(result.current.shouldShowGoBackToVizEditorModal).toBe(false);
      expect(props.application.navigateToApp).toHaveBeenCalledWith(props.legacyEditorAppName, {
        path: props.legacyEditorAppUrl,
      });
    });
  });
});
