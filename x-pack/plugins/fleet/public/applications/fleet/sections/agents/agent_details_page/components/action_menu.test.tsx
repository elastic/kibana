/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/dom';

import { createFleetTestRendererMock } from '../../../../../../mock';
import type { Agent, AgentPolicy } from '../../../../types';
import { ExperimentalFeaturesService } from '../../../../services';
import { useAuthz } from '../../../../../../hooks/use_authz';

import { AgentDetailsActionMenu } from './actions_menu';

jest.mock('../../../../../../services/experimental_features');
jest.mock('../../../../../../hooks/use_authz');

const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);
const mockedUseAuthz = jest.mocked(useAuthz);

function renderActions({ agent, agentPolicy }: { agent: Agent; agentPolicy?: AgentPolicy }) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(
    <AgentDetailsActionMenu
      agent={agent}
      agentPolicy={agentPolicy}
      assignFlyoutOpenByDefault={false}
      onCancelReassign={jest.fn()}
    />
  );

  fireEvent.click(utils.getByRole('button'));

  return { utils };
}

describe('AgentDetailsActionMenu', () => {
  beforeEach(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      diagnosticFileUploadEnabled: true,
    } as any);
    mockedUseAuthz.mockReturnValue({
      fleet: {
        all: true,
      },
    } as any);
  });

  describe('Request Diagnotics action', () => {
    function renderAndGetDiagnosticsButton({
      agent,
      agentPolicy,
    }: {
      agent: Agent;
      agentPolicy?: AgentPolicy;
    }) {
      const { utils } = renderActions({
        agent,
        agentPolicy,
      });

      return utils.queryByTestId('requestAgentDiagnosticsBtn');
    }

    it('should not render action if feature is disabled', async () => {
      mockedExperimentalFeaturesService.get.mockReturnValue({
        diagnosticFileUploadEnabled: false,
      } as any);
      const res = renderAndGetDiagnosticsButton({
        agent: {} as Agent,
        agentPolicy: {} as AgentPolicy,
      });
      expect(res).toBe(null);
    });

    it('should render an active action button if agent version >= 8.7', async () => {
      const res = renderAndGetDiagnosticsButton({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0' } } },
        } as any,
        agentPolicy: {} as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });

    it('should render an active action button if agent version >= 8.7 and policy is_managed', async () => {
      const res = renderAndGetDiagnosticsButton({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0' } } },
        } as any,
        agentPolicy: {
          is_managed: true,
        } as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });

    it('should render a disabled action button if agent version < 8.7', async () => {
      const res = renderAndGetDiagnosticsButton({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.6.0' } } },
        } as any,
        agentPolicy: {
          is_managed: true,
        } as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).not.toBeEnabled();
    });
  });

  describe('View agent JSON action', () => {
    function renderAndGetViewJSONButton({
      agent,
      agentPolicy,
    }: {
      agent: Agent;
      agentPolicy?: AgentPolicy;
    }) {
      const { utils } = renderActions({
        agent,
        agentPolicy,
      });

      return utils.queryByTestId('viewAgentDetailsJsonBtn');
    }

    it('should render an active button', async () => {
      const res = renderAndGetViewJSONButton({
        agent: {} as any,
        agentPolicy: {} as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });

    it('should render an active button for managed agent policy', async () => {
      const res = renderAndGetViewJSONButton({
        agent: {} as any,
        agentPolicy: {
          is_managed: true,
        } as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });
  });
});
