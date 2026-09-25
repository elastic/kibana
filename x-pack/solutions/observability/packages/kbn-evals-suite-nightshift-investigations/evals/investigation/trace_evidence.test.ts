/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import type { ToolCallStep } from '@kbn/agent-builder-common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  assertAgentTrace,
  assertSuccessfulSandboxCommand,
  containsTemplate,
} from './trace_evidence';

describe('containsTemplate', () => {
  const template = 'Start.{{load_step}} Middle.\n{{section}}\nEnd.';

  it.each([
    ['placeholders filled', 'Start. Load trees. Middle.\n<trees/>\nEnd.'],
    ['placeholders empty', 'Start. Middle.\n\nEnd.'],
    ['extra text around the prompt', 'Prefix. Start. Middle.\nEnd. Suffix.'],
  ])('accepts the prompt with %s', (_label, text) => {
    expect(containsTemplate(text, template)).toBe(true);
  });

  it.each([
    ['a missing piece', 'Start. Middle.'],
    ['pieces out of order', 'End. Start. Middle.'],
    ['an edited piece', 'Start. Changed.\nEnd.'],
  ])('rejects %s', (_label, text) => {
    expect(containsTemplate(text, template)).toBe(false);
  });

  it('rejects an empty template', () => {
    expect(containsTemplate('anything', '  ')).toBe(false);
  });

  it('matches the real deductive prompt with decision trees on and off', () => {
    const dir = join(
      REPO_ROOT,
      'x-pack/solutions/observability/plugins/nightshift_investigations/server/agents/deductive_investigation/instructions'
    );
    const raw = readFileSync(join(dir, 'deductive_investigator.md.text'), 'utf8');
    const trees = readFileSync(join(dir, 'decision_trees.text'), 'utf8');
    const fill = (loadStep: string, section: string) =>
      raw
        .replace('{{decision_trees_load_step}}', loadStep)
        .replace('{{decision_trees_section}}', section);

    const promptTemplate = cleanPrompt(raw);
    expect(promptTemplate).toContain('{{decision_trees_section}}');
    expect(containsTemplate(cleanPrompt(fill('', '')), promptTemplate)).toBe(true);
    expect(
      containsTemplate(
        cleanPrompt(fill(' Also check trees.', `\n${trees.trimEnd()}\n`)),
        promptTemplate
      )
    ).toBe(true);
  });
});

const toolCall = {
  type: ConversationRoundStepType.toolCall,
  tool_call_id: 'call',
  tool_id: 'nightshift_sandbox_bash',
  params: { command: 'python calculate.py' },
  results: [{ tool_result_id: 'result', type: ToolResultType.other, data: { stdout: '30%' } }],
} satisfies ToolCallStep;
const toolCallPart = {
  type: 'tool_call',
  id: toolCall.tool_call_id,
  name: toolCall.tool_id,
  arguments: JSON.stringify(toolCall.params),
};

const attributes = [
  {
    'gen_ai.input.messages': JSON.stringify([
      { role: 'user', parts: [{ type: 'text', content: 'Investigate synthetic timeouts.' }] },
    ]),
    'gen_ai.output.messages': JSON.stringify([
      {
        role: 'assistant',
        parts: [{ type: 'text', content: 'Timeouts increased after the change.' }, toolCallPart],
      },
    ]),
    'gen_ai.system_instructions': JSON.stringify([
      { type: 'text', content: 'Investigate the evidence.' },
    ]),
    'gen_ai.tool.call.id': toolCall.tool_call_id,
    'gen_ai.tool.name': toolCall.tool_id,
    'gen_ai.tool.call.arguments': JSON.stringify(toolCall.params),
    'gen_ai.tool.call.result': JSON.stringify({ results: toolCall.results }),
    'gen_ai.conversation.id': 'conversation',
  },
];
const expected = {
  question: 'Investigate synthetic timeouts.',
  conversationId: 'conversation',
  systemInstructions: 'Investigate the evidence.',
  rounds: [{ steps: [toolCall], response: { message: 'Timeouts increased after the change.' } }],
};

it('accepts a successful sandbox command after recovered tool errors', () => {
  expect(() =>
    assertSuccessfulSandboxCommand([
      {
        steps: [
          {
            ...toolCall,
            results: [
              {
                tool_result_id: 'failed',
                type: ToolResultType.error,
                data: { message: 'Transient sandbox failure' },
              },
            ],
          },
          {
            ...toolCall,
            results: [{ ...toolCall.results[0], data: { stdout: '30%', exit_code: 0 } }],
          },
        ],
      },
    ])
  ).not.toThrow();
});

it.each([
  {
    ...toolCall,
    tool_id: 'platform.streams.investigation_progress_report',
    results: [{ ...toolCall.results[0], data: { acknowledged: true } }],
  },
  {
    ...toolCall,
    results: [
      {
        tool_result_id: 'failed',
        type: ToolResultType.error,
        data: { message: 'Sandbox unavailable' },
      },
    ],
  },
  { ...toolCall, results: [{ ...toolCall.results[0], data: { exit_code: 1 } }] },
])('rejects bundled fixture acceptance without a successful sandbox command: %j', (step) => {
  expect(() => assertSuccessfulSandboxCommand([{ steps: [step] }])).toThrow('successful sandbox');
});

it('accepts full payload evidence for the investigation conversation', () => {
  expect(() => assertAgentTrace(attributes, expected)).not.toThrow();
});

it('checks executed progress arguments after schema ordering without losing the raw model call', () => {
  const low = { title: 'Low priority gap', description: 'Missing low signal', confidence: 0.2 };
  const high = { title: 'High priority gap', description: 'Missing high signal', confidence: 0.9 };
  const params = { summary: 'Investigating', hypotheses: [], blind_spots: [low, high] };
  const progressCall = {
    ...toolCall,
    tool_id: 'platform.streams.investigation_progress_report',
    params,
  };
  const spans = [
    {
      ...attributes[0],
      'gen_ai.tool.name': progressCall.tool_id,
      'gen_ai.tool.call.arguments': JSON.stringify({ ...params, blind_spots: [high, low] }),
      'gen_ai.output.messages': JSON.stringify([
        {
          role: 'assistant',
          parts: [
            { type: 'text', content: expected.rounds[0].response.message },
            {
              ...toolCallPart,
              name: sanitizeToolId(progressCall.tool_id),
              arguments: JSON.stringify(params),
            },
          ],
        },
      ]),
    },
  ];
  const progressExpected = {
    ...expected,
    rounds: [{ ...expected.rounds[0], steps: [progressCall] }],
  };
  expect(() => assertAgentTrace(spans, progressExpected)).not.toThrow();
  expect(() =>
    assertAgentTrace(
      [
        {
          ...spans[0],
          'gen_ai.tool.call.arguments': JSON.stringify({ ...params, blind_spots: [high] }),
        },
      ],
      progressExpected
    )
  ).toThrow('must retain arguments');
  expect(() =>
    assertAgentTrace(
      [
        {
          ...spans[0],
          'gen_ai.output.messages': spans[0]['gen_ai.output.messages'].replace(
            'Low priority gap',
            'Redacted'
          ),
        },
      ],
      progressExpected
    )
  ).toThrow('must retain the model tool call');
});

it('rejects a trace that retains message attributes but has redacted the user question', () => {
  expect(() =>
    assertAgentTrace(
      [
        {
          ...attributes[0],
          'gen_ai.input.messages': JSON.stringify([
            { role: 'assistant', parts: [{ type: 'text', content: expected.question }] },
          ]),
        },
      ],
      expected
    )
  ).toThrow('user question');
});

it('rejects a trace linked to another conversation', () => {
  expect(() => assertAgentTrace(attributes, { ...expected, conversationId: 'other' })).toThrow(
    'conversation'
  );
});

it.each([
  'gen_ai.tool.call.arguments',
  'gen_ai.tool.call.result',
  'gen_ai.system_instructions',
  'gen_ai.output.messages',
])('rejects missing %s payloads', (field) => {
  expect(() => assertAgentTrace([{ ...attributes[0], [field]: '' }], expected)).toThrow();
});

it.each(['gen_ai.tool.call.arguments', 'gen_ai.tool.call.result', 'gen_ai.system_instructions'])(
  'rejects nonempty redacted, malformed and mismatched %s payloads',
  (field) => {
    for (const value of ['"[REDACTED]"', '{broken', '{"different":"payload"}']) {
      expect(() => assertAgentTrace([{ ...attributes[0], [field]: value }], expected)).toThrow();
    }
  }
);

it('rejects a structurally valid redacted system prompt', () => {
  expect(() =>
    assertAgentTrace(
      [
        {
          ...attributes[0],
          'gen_ai.system_instructions': JSON.stringify([{ type: 'text', content: '[REDACTED]' }]),
        },
      ],
      expected
    )
  ).toThrow();
});

it('requires every conversation tool call to have a corresponding span', () => {
  expect(() =>
    assertAgentTrace(attributes, {
      ...expected,
      rounds: [
        { ...expected.rounds[0], steps: [toolCall, { ...toolCall, tool_call_id: 'missing' }] },
      ],
    })
  ).toThrow();
});

it('rejects changed tool result content', () => {
  expect(() =>
    assertAgentTrace(attributes, {
      ...expected,
      rounds: [
        {
          ...expected.rounds[0],
          steps: [
            { ...toolCall, results: [{ ...toolCall.results[0], data: { stdout: 'different' } }] },
          ],
        },
      ],
    })
  ).toThrow();
});

it('allows result IDs assigned after the tool span ends', () => {
  expect(() =>
    assertAgentTrace(
      [
        {
          ...attributes[0],
          'gen_ai.tool.call.result': JSON.stringify({
            results: [{ type: ToolResultType.other, data: { stdout: '30%' } }],
          }),
        },
      ],
      expected
    )
  ).not.toThrow();
});

it.each([
  [{ type: ToolResultType.error, data: { message: 'Sandbox unavailable' } }],
  { error: 'Sandbox unavailable' },
])('accepts matching tool error evidence: %j', (result) => {
  expect(() =>
    assertAgentTrace([{ ...attributes[0], 'gen_ai.tool.call.result': JSON.stringify(result) }], {
      ...expected,
      rounds: [
        {
          ...expected.rounds[0],
          steps: [
            {
              ...toolCall,
              results: [
                {
                  tool_result_id: 'error',
                  type: ToolResultType.error,
                  data: { message: 'Sandbox unavailable' },
                },
              ],
            },
          ],
        },
      ],
    })
  ).not.toThrow();
});

it('rejects redacted responses even when all tool and system payloads remain intact', () => {
  expect(() =>
    assertAgentTrace(
      [
        {
          ...attributes[0],
          'gen_ai.output.messages': JSON.stringify([
            { role: 'assistant', parts: [{ type: 'text', content: '[REDACTED]' }] },
          ]),
        },
      ],
      expected
    )
  ).toThrow();
});

it('accepts structured final responses exported as tool-call arguments', () => {
  expect(() =>
    assertAgentTrace(
      [
        {
          ...attributes[0],
          'gen_ai.output.messages': JSON.stringify([
            {
              role: 'assistant',
              parts: [
                {
                  type: 'tool_call',
                  id: 'final',
                  name: 'structuredResponse',
                  arguments: '{ "conclusion": "Timeouts increased." }',
                },
                toolCallPart,
              ],
            },
          ]),
        },
      ],
      {
        ...expected,
        rounds: [
          { ...expected.rounds[0], response: { message: '{"conclusion":"Timeouts increased."}' } },
        ],
      }
    )
  ).not.toThrow();
});

it.each(['missing', 'redacted'])(
  'rejects %s intermediate model tool calls despite complete final and execution evidence',
  (mode) => {
    expect(() =>
      assertAgentTrace(
        [
          {
            ...attributes[0],
            'gen_ai.output.messages': JSON.stringify([
              {
                role: 'assistant',
                parts: [
                  { type: 'text', content: expected.rounds[0].response.message },
                  ...(mode === 'missing' ? [] : [{ ...toolCallPart, arguments: '"[REDACTED]"' }]),
                ],
              },
            ]),
          },
        ],
        expected
      )
    ).toThrow();
  }
);

const validationError = 'Error: Received tool input did not match expected schema: missing summary';

it.each([
  ['matching', '{}', validationError, '{"bad":"input"}', validationError, true],
  [
    'changed arguments',
    '{"unexpected":true}',
    validationError,
    '{"bad":"input"}',
    validationError,
    false,
  ],
  ['redacted result', '{}', '[REDACTED]', '{"bad":"input"}', validationError, false],
  ['missing result', '{}', '', '{"bad":"input"}', validationError, false],
  ['redacted original call', '{}', validationError, '"[REDACTED]"', validationError, false],
  ['missing original call', '{}', validationError, '', validationError, false],
  ['ordinary tool failure', '{}', 'Sandbox unavailable', '{}', 'Sandbox unavailable', false],
])(
  'checks pre-execution validation errors in LLM messages: %s',
  (_name, args, error, attempted, storedError, accepted) => {
    const rejectedCall = {
      ...toolCall,
      tool_call_id: 'rejected',
      params: {},
      results: [
        { tool_result_id: 'error', type: ToolResultType.error, data: { message: storedError } },
      ],
    };
    const tracedMessages = {
      'gen_ai.output.messages': JSON.stringify([
        {
          role: 'assistant',
          parts: [
            {
              type: 'tool_call',
              id: 'rejected',
              name: toolCall.tool_id,
              arguments: attempted,
            },
          ],
        },
      ]),
      'gen_ai.input.messages': JSON.stringify([
        {
          role: 'assistant',
          parts: [{ type: 'tool_call', id: 'rejected', name: toolCall.tool_id, arguments: args }],
        },
        {
          role: 'tool',
          parts: [
            {
              type: 'tool_call_response',
              id: 'rejected',
              response: JSON.stringify({ response: `<tool_result>${error}</tool_result>` }),
            },
          ],
        },
      ]),
    };
    const check = () =>
      assertAgentTrace([...attributes, tracedMessages], {
        ...expected,
        rounds: [{ ...expected.rounds[0], steps: [toolCall, rejectedCall] }],
      });
    if (accepted) {
      expect(check).not.toThrow();
    } else {
      expect(check).toThrow();
    }
  }
);
