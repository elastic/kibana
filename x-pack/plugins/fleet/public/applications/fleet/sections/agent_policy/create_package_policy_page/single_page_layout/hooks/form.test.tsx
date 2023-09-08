/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react-hooks';
import type { RenderHookResult } from '@testing-library/react-hooks';

import type { TestRenderer } from '../../../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../../../mock';
import type { AgentPolicy, PackageInfo } from '../../../../../types';

import { sendGetPackagePolicies } from '../../../../../hooks';

import { SelectedPolicyTab } from '../../components';

import { useOnSubmit } from './form';

jest.mock('../../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../../hooks'),
    sendGetPackagePolicies: jest.fn().mockReturnValue({
      data: {
        items: [{ name: 'nginx-1' }, { name: 'other-policy' }],
      },
      isLoading: false,
    }),
    useFleetStatus: jest.fn().mockReturnValue({ isReady: true } as any),
    sendGetStatus: jest
      .fn()
      .mockResolvedValue({ data: { isReady: true, missing_requirements: [] } }),
  };
});

describe('useOnSubmit', () => {
  const packageInfo: PackageInfo = {
    name: 'apache',
    version: '1.0.0',
    description: '',
    format_version: '',
    release: 'ga',
    owner: { github: '' },
    title: 'Apache',
    latestVersion: '',
    assets: {} as any,
    status: 'not_installed',
    vars: [
      {
        show_user: true,
        name: 'Show user var',
        type: 'string',
        default: 'showUserVarVal',
      },
      {
        required: true,
        name: 'Required var',
        type: 'bool',
      },
      {
        name: 'Advanced var',
        type: 'bool',
        default: true,
      },
    ],
  };

  let testRenderer: TestRenderer;
  let renderResult: RenderHookResult<
    Parameters<typeof useOnSubmit>,
    ReturnType<typeof useOnSubmit>
  >;
  const render = ({ isUpdate } = { isUpdate: false }) =>
    (renderResult = testRenderer.renderHook(() =>
      useOnSubmit({
        agentCount: 0,
        packageInfo,
        withSysMonitoring: false,
        selectedPolicyTab: SelectedPolicyTab.NEW,
        newAgentPolicy: { name: 'test', namespace: 'default' },
        queryParamsPolicyId: undefined,
      })
    ));

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
  });

  describe('default API response', () => {
    beforeEach(() => {
      act(() => {
        render();
      });
    });

    it('should set package policy id and namespace when agent policy changes', () => {
      act(() => {
        renderResult.result.current.updateAgentPolicy({
          id: 'some-id',
          namespace: 'default',
        } as AgentPolicy);
      });

      expect(renderResult.result.current.packagePolicy).toEqual({
        policy_id: 'some-id',
        namespace: 'default',
        description: '',
        enabled: true,
        inputs: [],
        name: 'apache-1',
        package: {
          name: 'apache',
          title: 'Apache',
          version: '1.0.0',
        },
        vars: {
          'Advanced var': {
            type: 'bool',
            value: true,
          },
          'Required var': {
            type: 'bool',
            value: undefined,
          },
          'Show user var': {
            type: 'string',
            value: 'showUserVarVal',
          },
        },
      });
    });

    it('should set index 1 name to package policy on init if no package policies exist for this package', () => {
      // waitFor(() => {
      //   expect(renderResult.getByDisplayValue('apache-1')).toBeInTheDocument();
      //   expect(renderResult.getByDisplayValue('desc')).toBeInTheDocument();
      // });

      expect(renderResult.result.current.packagePolicy).toEqual({
        description: '',
        enabled: true,
        inputs: [],
        name: 'apache-1',
        namespace: 'default',
        policy_id: '',
        package: {
          name: 'apache',
          title: 'Apache',
          version: '1.0.0',
        },
        vars: {
          'Advanced var': {
            type: 'bool',
            value: true,
          },
          'Required var': {
            type: 'bool',
            value: undefined,
          },
          'Show user var': {
            type: 'string',
            value: 'showUserVarVal',
          },
        },
      });
    });
  });

  it('should set incremented name if other package policies exist', async () => {
    (sendGetPackagePolicies as jest.MockedFunction<any>).mockReturnValue({
      data: {
        items: [
          { name: 'apache-1' },
          { name: 'apache-2' },
          { name: 'apache-9' },
          { name: 'apache-10' },
        ],
      },
      isLoading: false,
    });

    await render();

    expect(renderResult.result.current.packagePolicy).toEqual({
      description: '',
      enabled: true,
      inputs: [],
      name: 'apache-11',
      namespace: 'default',
      policy_id: '',
      package: {
        name: 'apache',
        title: 'Apache',
        version: '1.0.0',
      },
      vars: {
        'Advanced var': {
          type: 'bool',
          value: true,
        },
        'Required var': {
          type: 'bool',
          value: undefined,
        },
        'Show user var': {
          type: 'string',
          value: 'showUserVarVal',
        },
      },
    });
  });
});
