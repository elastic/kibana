/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-test-renderer';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { useFleetProxyForm } from './use_fleet_proxy_form';

jest.mock('../../../../../../hooks/use_authz', () => ({
  useAuthz: () => ({
    fleet: {
      allSettings: true,
    },
  }),
}));

describe('useFleetProxyForm', () => {
  describe('validate url', () => {
    it('should accept http url', async () => {
      const testRenderer = createFleetTestRendererMock();
      const { result } = testRenderer.renderHook(() => useFleetProxyForm(undefined, () => {}));
      act(() => result.current.inputs.urlInput.setValue('http://test.fr:8080'));
      act(() => expect(result.current.inputs.urlInput.validate()).toBeTruthy());
      expect(result.current.inputs.urlInput.errors).toBeUndefined();
    });

    it('should accept https url', async () => {
      const testRenderer = createFleetTestRendererMock();
      const { result } = testRenderer.renderHook(() => useFleetProxyForm(undefined, () => {}));
      act(() => result.current.inputs.urlInput.setValue('https://test.fr:8080'));
      act(() => expect(result.current.inputs.urlInput.validate()).toBeTruthy());
      expect(result.current.inputs.urlInput.errors).toBeUndefined();
    });
    it('should accept socks5 url', async () => {
      const testRenderer = createFleetTestRendererMock();
      const { result } = testRenderer.renderHook(() => useFleetProxyForm(undefined, () => {}));
      act(() => result.current.inputs.urlInput.setValue('socks5://test.fr:8080'));
      act(() => expect(result.current.inputs.urlInput.validate()).toBeTruthy());
      expect(result.current.inputs.urlInput.errors).toBeUndefined();
    });

    it('should not accept invalid url', async () => {
      const testRenderer = createFleetTestRendererMock();
      const { result } = testRenderer.renderHook(() => useFleetProxyForm(undefined, () => {}));
      act(() => result.current.inputs.urlInput.setValue('iamnotavaliderror'));
      act(() => expect(result.current.inputs.urlInput.validate()).toBeFalsy());

      expect(result.current.inputs.urlInput.errors).toEqual(['Invalid URL']);
    });
  });
});
