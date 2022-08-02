/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-test-renderer';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { useFleetServerHostsForm } from './use_fleet_server_host_form';

jest.mock('../../services/agent_and_policies_count', () => ({
  ...jest.requireActual('../../services/agent_and_policies_count'),
  getAgentAndPolicyCount: () => ({ agentCount: 0, agentPolicyCount: 0 }),
}));
jest.mock('../../hooks/use_confirm_modal', () => ({
  ...jest.requireActual('../../hooks/use_confirm_modal'),
  useConfirmModal: () => ({ confirm: () => true }),
}));

describe('useFleetServerHostsForm', () => {
  it('should not allow to submit an invalid form', async () => {
    const testRenderer = createFleetTestRendererMock();
    const onSucess = jest.fn();
    const { result } = testRenderer.renderHook(() => useFleetServerHostsForm([], onSucess));

    act(() =>
      result.current.fleetServerHostsInput.props.onChange(['https://test.fr', 'https://test.fr'])
    );

    await act(() => result.current.submit());

    expect(result.current.fleetServerHostsInput.props.errors).toMatchInlineSnapshot(`
      Array [
        Object {
          "index": 0,
          "message": "Duplicate URL",
        },
        Object {
          "index": 1,
          "message": "Duplicate URL",
        },
      ]
    `);
    expect(onSucess).not.toBeCalled();
    expect(result.current.isDisabled).toBeTruthy();
  });

  it('should submit a valid form', async () => {
    const testRenderer = createFleetTestRendererMock();
    const onSucess = jest.fn();
    testRenderer.startServices.http.post.mockResolvedValue({});
    const { result } = testRenderer.renderHook(() => useFleetServerHostsForm([], onSucess));

    act(() => result.current.fleetServerHostsInput.props.onChange(['https://test.fr']));

    await act(() => result.current.submit());
    expect(onSucess).toBeCalled();
  });

  it('should allow the user to correct and submit a invalid form', async () => {
    const testRenderer = createFleetTestRendererMock();
    const onSucess = jest.fn();
    testRenderer.startServices.http.post.mockResolvedValue({});
    const { result } = testRenderer.renderHook(() => useFleetServerHostsForm([], onSucess));

    act(() =>
      result.current.fleetServerHostsInput.props.onChange(['https://test.fr', 'https://test.fr'])
    );

    await act(() => result.current.submit());
    expect(onSucess).not.toBeCalled();
    expect(result.current.isDisabled).toBeTruthy();

    act(() => result.current.fleetServerHostsInput.props.onChange(['https://test.fr']));
    expect(result.current.isDisabled).toBeFalsy();

    await act(() => result.current.submit());
    expect(onSucess).toBeCalled();
  });
});
