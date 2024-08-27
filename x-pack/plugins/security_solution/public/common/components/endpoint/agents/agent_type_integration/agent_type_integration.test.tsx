/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../../mock/endpoint';
import { createAppRootMockRenderer } from '../../../../mock/endpoint';
import type { AgentTypeIntegrationProps } from './agent_type_integration';
import { AgentTypeIntegration, INTEGRATION_SECTION_LABEL } from './agent_type_integration';
import { getAgentTypeName } from '../../../../translations';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../../../common/endpoint/service/response_actions/constants';

describe('AgentTypeIntegration component', () => {
  let props: AgentTypeIntegrationProps;
  let render: () => ReturnType<AppContextTestRender['render']>;

  describe.each(RESPONSE_ACTION_AGENT_TYPE)('for agent type: %s', (agentType) => {
    beforeEach(() => {
      const mockedContext = createAppRootMockRenderer();

      props = { agentType, 'data-test-subj': 'test' };

      render = () => {
        return mockedContext.render(<AgentTypeIntegration {...props} />);
      };
    });

    it('should display agent type vendor name', () => {
      const { getByTestId } = render();

      expect(getByTestId('test-name')).toHaveTextContent(getAgentTypeName(agentType));
    });

    it('should display agent type vendor icon', () => {
      const { getByTestId } = render();

      expect(getByTestId('test-vendorLogo'));
    });

    it('should display label', () => {
      const { getByTestId } = render();

      expect(getByTestId('test-label')).toHaveTextContent(INTEGRATION_SECTION_LABEL);
    });

    it('should include tooltip', () => {
      const { getByTestId } = render();

      expect(getByTestId('test-tooltipAnchor'));
    });
  });
});
