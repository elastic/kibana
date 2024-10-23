/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientLlm } from '@kbn/langchain/server';
import { loggerMock } from '@kbn/logging-mocks';
import { FakeLLM } from '@langchain/core/utils/testing';

import { getGenerateNode } from '.';
import {
  mockAnonymizedAlerts,
  mockAnonymizedAlertsReplacements,
} from '../../../../evaluation/__mocks__/mock_anonymized_alerts';
import { getAnonymizedAlertsFromState } from './helpers/get_anonymized_alerts_from_state';
import { getChainWithFormatInstructions } from '../helpers/get_chain_with_format_instructions';
import { GraphState } from '../../types';

jest.mock('../helpers/get_chain_with_format_instructions', () => {
  const mockInvoke = jest.fn().mockResolvedValue('');

  return {
    getChainWithFormatInstructions: jest.fn().mockReturnValue({
      chain: {
        invoke: mockInvoke,
      },
      formatInstructions: ['mock format instructions'],
      llmType: 'fake',
      mockInvoke, // <-- added for testing
    }),
  };
});

const mockLogger = loggerMock.create();
let mockLlm: ActionsClientLlm;

const initialGraphState: GraphState = {
  attackDiscoveries: null,
  attackDiscoveryPrompt:
    "You are a cyber security analyst tasked with analyzing security events from Elastic Security to identify and report on potential cyber attacks or progressions. Your report should focus on high-risk incidents that could severely impact the organization, rather than isolated alerts. Present your findings in a way that can be easily understood by anyone, regardless of their technical expertise, as if you were briefing the CISO. Break down your response into sections based on timing, hosts, and users involved. When correlating alerts, use kibana.alert.original_time when it's available, otherwise use @timestamp. Include appropriate context about the affected hosts and users. Describe how the attack progression might have occurred and, if feasible, attribute it to known threat groups. Prioritize high and critical alerts, but include lower-severity alerts if desired. In the description field, provide as much detail as possible, in a bulleted list explaining any attack progressions. Accuracy is of utmost importance. You MUST escape all JSON special characters (i.e. backslashes, double quotes, newlines, tabs, carriage returns, backspaces, and form feeds).",
  anonymizedAlerts: [...mockAnonymizedAlerts],
  combinedGenerations: '',
  combinedRefinements: '',
  errors: [],
  generationAttempts: 0,
  generations: [],
  hallucinationFailures: 0,
  maxGenerationAttempts: 10,
  maxHallucinationFailures: 5,
  maxRepeatedGenerations: 3,
  refinements: [],
  refinePrompt:
    'You previously generated the following insights, but sometimes they represent the same attack.\n\nCombine the insights below, when they represent the same attack; leave any insights that are not combined unchanged:',
  replacements: {
    ...mockAnonymizedAlertsReplacements,
  },
  unrefinedResults: null,
};

describe('getGenerateNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockLlm = new FakeLLM({
      response: JSON.stringify({}, null, 2),
    }) as unknown as ActionsClientLlm;
  });

  it('returns a function', () => {
    const generateNode = getGenerateNode({
      llm: mockLlm,
      logger: mockLogger,
    });

    expect(typeof generateNode).toBe('function');
  });

  it('invokes the chain with the alerts from state and format instructions', async () => {
    // @ts-expect-error
    const { mockInvoke } = getChainWithFormatInstructions(mockLlm);

    const generateNode = getGenerateNode({
      llm: mockLlm,
      logger: mockLogger,
    });

    await generateNode(initialGraphState);

    expect(mockInvoke).toHaveBeenCalledWith({
      format_instructions: ['mock format instructions'],
      query: `${initialGraphState.attackDiscoveryPrompt}

Use context from the following alerts to provide insights:

\"\"\"
${getAnonymizedAlertsFromState(initialGraphState).join('\n\n')}
\"\"\"
`,
    });
  });
});
