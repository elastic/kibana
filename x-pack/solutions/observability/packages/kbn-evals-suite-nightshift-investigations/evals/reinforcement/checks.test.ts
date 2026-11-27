/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  checkCausalPathMarked,
  checkNoVisitedCheckmarks,
  checkReinforcementDetected,
  checkStructurePreserved,
} from './checks';
import type { CheckContext } from './checks';
import type { AppliedWrite, PathStep, ReinforcementTaskOutput, SubmitArguments } from './types';

const TREE_ID = 'symptom:otel-gateway-errors';
const NEW_TREE_ID = 'symptom:uiam-pod-loss';

const tree = (edges: string[]): string =>
  ['flowchart TD', ...edges.map((edge) => `    ${edge}`)].join('\n');

const PRIOR = tree([
  'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
  'E1 --> D1{{Errors point at one upstream?}}',
  'D1 -->|yes| E2[Correlate with the upstream pod]',
  'D1 -->|no| E3[Check gateway resource usage]',
  'E2 --> D2{{Errors stop after the pod is replaced?}}',
  'D2 -->|yes| X1((Upstream pod loss))',
  'D2 -->|no| X2((Upstream fault persists))',
  'E3 --> X3((Gateway resource exhaustion))',
]);

/** The confirmed round marked exactly S1 to X1. */
const CONFIRMED = tree([
  'S1([Otel delivery gateway errors]) -->|✅| E1[Check gateway error logs]',
  'E1 -->|✅| D1{{Errors point at one upstream?}}',
  'D1 -->|✅ yes| E2[Correlate with the upstream pod]',
  'D1 -->|no| E3[Check gateway resource usage]',
  'E2 -->|✅| D2{{Errors stop after the pod is replaced?}}',
  'D2 -->|✅ yes| X1((Upstream pod loss))',
  'D2 -->|no| X2((Upstream fault persists))',
  'E3 --> X3((Gateway resource exhaustion))',
]);

const CAUSAL_PATH: PathStep[] = ['S1', 'E1', 'D1', 'E2', 'D2', 'X1'];

const submit = (causalPath: PathStep[] = [], extra: Partial<SubmitArguments> = {}) => ({
  symptom_trees: [{ tree_id: TREE_ID, merged_nodes: [] }],
  traversals: [{ tree_id: TREE_ID, visited_path: CAUSAL_PATH, causal_path: causalPath }],
  ...extra,
});

const context = ({
  prior = PRIOR,
  submitted,
  submission = submit(),
  causalConfirmed,
  writes = [],
  seeded = true,
}: {
  prior?: string;
  submitted: string;
  submission?: SubmitArguments;
  causalConfirmed: boolean;
  writes?: AppliedWrite[];
  seeded?: boolean;
}): CheckContext => {
  const output: ReinforcementTaskOutput = {
    case_id: 'case-1',
    submissions: [submission],
    applied_writes: writes,
    trees: [
      {
        tree_id: seeded ? TREE_ID : NEW_TREE_ID,
        ...(seeded ? { prior_mermaid: prior } : {}),
        submitted_mermaid: submitted,
      },
    ],
  };
  return { output, seededTreeId: seeded ? TREE_ID : undefined, causalConfirmed };
};

describe('checkNoVisitedCheckmarks', () => {
  it('passes when the new ✅ are exactly the causal path', () => {
    const graded = checkNoVisitedCheckmarks(
      context({ submitted: CONFIRMED, submission: submit(CAUSAL_PATH), causalConfirmed: true })
    );

    expect(graded.score).toBe(1);
  });

  it('fails a visited edge marked ✅ off the causal path', () => {
    const visited = tree([
      'S1([Otel delivery gateway errors]) -->|✅| E1[Check gateway error logs]',
      'E1 -->|✅| D1{{Errors point at one upstream?}}',
      'D1 -->|yes| E2[Correlate with the upstream pod]',
      'D1 -->|✅ no| E3[Check gateway resource usage]',
      'E2 --> D2{{Errors stop after the pod is replaced?}}',
      'D2 -->|yes| X1((Upstream pod loss))',
      'D2 -->|no| X2((Upstream fault persists))',
      'E3 --> X3((Gateway resource exhaustion))',
    ]);

    const graded = checkNoVisitedCheckmarks(
      context({ submitted: visited, submission: submit(['S1', 'E1']), causalConfirmed: true })
    );

    expect(graded.score).toBe(0);
    expect(graded.explanation).toContain('D1 -->|no| E3');
    expect(graded.explanation).not.toContain('S1 --> E1');
  });

  it('passes a legacy ✅ the prior tree already carried', () => {
    const legacy = PRIOR.replace('D1 -->|no| E3', 'D1 -->|✅ no| E3');

    const graded = checkNoVisitedCheckmarks(
      context({ prior: legacy, submitted: legacy, causalConfirmed: false })
    );

    expect(graded.score).toBe(1);
  });

  it('does not let a legacy ✅ exempt a parallel edge between the same nodes', () => {
    const parallel = (yes: string, no: string) =>
      tree([
        'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
        'E1 --> D1{{Errors point at one upstream?}}',
        `D1 -->|${yes}| X1((Upstream pod loss))`,
        `D1 -->|${no}| X1`,
      ]);

    const graded = checkNoVisitedCheckmarks(
      context({
        prior: parallel('✅ yes', 'no'),
        submitted: parallel('✅ yes', '✅ no'),
        causalConfirmed: false,
      })
    );

    expect(graded.score).toBe(0);
    expect(graded.explanation).toContain('D1 -->|no| X1');
  });

  it('keeps a legacy ✅ legacy after its node is merged away', () => {
    const legacy = tree([
      'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
      'E1 --> D1{{Errors point at one upstream?}}',
      'D1 -->|✅ yes| E2[Correlate with the upstream pod]',
      'D1 -->|yes| E3[Check the upstream pod restarts]',
      'E2 -->|✅| X1((Upstream pod loss))',
      'E3 --> X1',
      'D1 -->|no| X2((Gateway fault))',
    ]);
    const folded = tree([
      'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
      'E1 --> D1{{Errors point at one upstream?}}',
      'D1 -->|✅ yes| E3[Check the upstream pod restarts]',
      'E3 -->|✅| X1((Upstream pod loss))',
      'D1 -->|no| X2((Gateway fault))',
    ]);
    // The fold maps both prior `yes` edges onto one edge, which may also be relabelled.
    const relabelled = folded.replace('D1 -->|✅ yes| E3', 'D1 -->|✅ one upstream named| E3');

    for (const submitted of [folded, relabelled]) {
      const graded = context({
        prior: legacy,
        submitted,
        submission: submit([], {
          symptom_trees: [{ tree_id: TREE_ID, merged_nodes: [{ from: ['E2'], into: 'E3' }] }],
          traversals: [{ tree_id: TREE_ID, visited_path: ['S1', 'E1', 'D1'] }],
        }),
        causalConfirmed: false,
      });

      expect(checkNoVisitedCheckmarks(graded).score).toBe(1);
      expect(checkCausalPathMarked(graded).score).toBe(1);
    }
  });

  it('does not move a legacy ✅ through a merge the final tree does not carry out', () => {
    const twoBranches = (first: string, second: string) =>
      tree([
        'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
        'E1 --> D1{{Errors point at one upstream?}}',
        `D1 -->|${first}| E2[Correlate with the upstream pod]`,
        `D1 -->|${second}| E3[Check the upstream pod restarts]`,
        'E2 --> X1((Upstream pod loss))',
        'E3 --> X1',
      ]);

    const graded = checkNoVisitedCheckmarks(
      context({
        prior: twoBranches('✅ yes', 'yes'),
        submitted: twoBranches('yes', '✅ yes'),
        // A rejected attempt proposed the fold; the final tree keeps both nodes.
        submission: submit([], {
          symptom_trees: [{ tree_id: TREE_ID, merged_nodes: [{ from: ['E2'], into: 'E3' }] }],
          traversals: [{ tree_id: TREE_ID, visited_path: ['S1', 'E1', 'D1'] }],
        }),
        causalConfirmed: false,
      })
    );

    expect(graded.score).toBe(0);
    expect(graded.explanation).toContain('D1 -->|yes| E3');
  });

  it('stops a merge chain at the first node the final tree keeps', () => {
    const branches = (edges: string[]) =>
      tree([
        'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
        'E1 --> D1{{Errors point at one upstream?}}',
        ...edges,
        'E3 --> X1((Upstream pod loss))',
        'E4 --> X1',
      ]);
    const prior = branches([
      'D1 -->|✅ yes| E2[Correlate with the upstream pod]',
      'D1 -->|yes| E3[Check the upstream pod restarts]',
      'D1 -->|no| E4[Check the upstream pod lifecycle]',
      'E2 --> X1',
    ]);
    const submitted = branches([
      'D1 -->|✅ yes| E3[Check the upstream pod restarts]',
      'D1 -->|no| E4[Check the upstream pod lifecycle]',
    ]);
    // A rejected attempt proposed E3 into E4; the retry folded E2 into E3 and kept E3 and E4.
    const submissions = [[{ from: ['E3'], into: 'E4' }], [{ from: ['E2'], into: 'E3' }]].map(
      (mergedNodes) =>
        submit([], {
          symptom_trees: [{ tree_id: TREE_ID, merged_nodes: mergedNodes }],
          traversals: [{ tree_id: TREE_ID, visited_path: ['S1', 'E1', 'D1'] }],
        })
    );
    const base = context({ prior, submitted, causalConfirmed: false });

    const graded = checkNoVisitedCheckmarks({ ...base, output: { ...base.output, submissions } });

    expect(graded.explanation).not.toContain('✅ added');
    expect(graded.score).toBe(1);
  });

  it('fails a tree without a decision node', () => {
    const graded = checkNoVisitedCheckmarks(
      context({
        submitted: tree(['S1([Gateway errors]) --> E1[Check logs]', 'E1 --> X1((Pod loss))']),
        causalConfirmed: false,
      })
    );

    expect(graded.score).toBe(0);
    expect(graded.explanation).toContain('has no decision node');
  });
});

describe('checkCausalPathMarked', () => {
  it('passes a confirmed round that marks the walk from symptom to end node', () => {
    const graded = checkCausalPathMarked(
      context({ submitted: CONFIRMED, submission: submit(CAUSAL_PATH), causalConfirmed: true })
    );

    expect(graded.score).toBe(1);
  });

  it.each([
    {
      name: 'a causal edge without ✅',
      submitted: CONFIRMED.replace('E2 -->|✅| D2', 'E2 --> D2'),
      causalPath: CAUSAL_PATH,
      problem: 'causal_path edges without ✅: E2 -->',
    },
    {
      name: 'an empty causal path',
      submitted: CONFIRMED,
      causalPath: [],
      problem: 'causal_path is empty',
    },
    {
      name: 'a causal path that does not start at a symptom node',
      submitted: CONFIRMED.replace(
        'S1([Otel delivery gateway errors]) -->|✅| E1',
        'S1([Otel delivery gateway errors]) --> E1'
      ),
      causalPath: CAUSAL_PATH.slice(1),
      problem: 'starts at E1, not at a symptom node',
    },
    {
      name: 'a causal path that does not end at an end node',
      submitted: CONFIRMED.replace('D2 -->|✅ yes| X1', 'D2 -->|yes| X1'),
      causalPath: CAUSAL_PATH.slice(0, -1),
      problem: 'ends at D2, not at an end node',
    },
  ])('fails a confirmed round with $name', ({ submitted, causalPath, problem }) => {
    const graded = checkCausalPathMarked(
      context({ submitted, submission: submit(causalPath), causalConfirmed: true })
    );

    expect(graded.score).toBe(0);
    expect(graded.explanation).toContain(problem);
  });

  it('fails a confirmed round that also marks a visited edge', () => {
    const extra = CONFIRMED.replace('D1 -->|no| E3', 'D1 -->|✅ no| E3');

    const graded = checkCausalPathMarked(
      context({ submitted: extra, submission: submit(CAUSAL_PATH), causalConfirmed: true })
    );

    expect(graded.score).toBe(0);
    expect(graded.explanation).toContain('off the causal path: D1 -->|no| E3');
  });

  it('fails a new tree that adds ✅ when the round confirmed no cause', () => {
    const graded = checkCausalPathMarked(
      context({ submitted: CONFIRMED, causalConfirmed: false, seeded: false })
    );

    expect(graded.score).toBe(0);
    expect(graded.explanation).toContain('confirmed no cause, but ✅ was added');
  });
});

describe('checkStructurePreserved', () => {
  it('fails when an unrelated branch is dropped', () => {
    const dropped = tree([
      'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
      'E1 --> D1{{Errors point at one upstream?}}',
      'D1 -->|yes| E2[Correlate with the upstream pod]',
      'E2 --> D2{{Errors stop after the pod is replaced?}}',
      'D2 -->|yes| X1((Upstream pod loss))',
      'D2 -->|no| X2((Upstream fault persists))',
    ]);

    const graded = checkStructurePreserved(context({ submitted: dropped, causalConfirmed: false }));

    expect(graded.score).toBe(0);
    expect(graded.explanation).toContain('node E3');
    expect(graded.explanation).toContain('edge D1 -->|no| E3 was removed');
  });

  it('passes when the round relabels and splits only what it walked', () => {
    const split = tree([
      'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
      'E1 --> D1{{Errors point at one upstream?}}',
      'D1 -->|yes| E2[Correlate gateway errors with the upstream pod]',
      'D1 -->|no| E3[Check gateway resource usage]',
      'E2 --> E4[Check the upstream pod lifecycle]',
      'E4 --> D2{{Errors stop after the pod is replaced?}}',
      'D2 -->|yes| X1((Upstream pod loss))',
      'D2 -->|no| X2((Upstream fault persists))',
      'E3 --> X3((Gateway resource exhaustion))',
    ]);

    const graded = checkStructurePreserved(
      context({
        submitted: split,
        submission: submit([], {
          traversals: [{ tree_id: TREE_ID, visited_path: ['S1', 'E1', 'D1', 'E2', 'E4', 'D2'] }],
        }),
        causalConfirmed: false,
      })
    );

    expect(graded.explanation).not.toContain('E2');
    expect(graded.score).toBe(1);
  });

  // From a live run: the agent inserted verified steps on the walked yes branch, below which the
  // old terminal now hangs.
  it('passes when the round inserts steps between a walked node and its old target', () => {
    const extended = tree([
      'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
      'E1 --> D1{{Errors point at one upstream?}}',
      'D1 -->|yes| E2[Correlate with the upstream pod]',
      'D1 -->|no| E3[Check gateway resource usage]',
      'E2 --> D3{{Upstream pod deleted?}}',
      'D3 -->|yes| D2{{Errors stop after the pod is replaced?}}',
      'D3 -->|no| X4((Upstream pod still running))',
      'D2 -->|yes| X1((Upstream pod loss))',
      'D2 -->|no| X2((Upstream fault persists))',
      'E3 --> X3((Gateway resource exhaustion))',
    ]);

    const graded = checkStructurePreserved(
      context({
        submitted: extended,
        submission: submit([], {
          traversals: [
            { tree_id: TREE_ID, visited_path: ['S1', 'E1', 'D1', 'E2', 'D3', 'D2', 'X1'] },
          ],
        }),
        causalConfirmed: false,
      })
    );

    expect(graded.explanation).toContain('keeps every node and edge');
    expect(graded.score).toBe(1);
  });

  it('fails when the round drops the parallel branch it did not take', () => {
    const parallel = (edges: string[]) =>
      tree([
        'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
        'E1 --> D1{{Errors point at one upstream?}}',
        ...edges,
      ]);

    const graded = checkStructurePreserved(
      context({
        prior: parallel(['D1 -->|yes| X1((Upstream pod loss))', 'D1 -->|no| X1']),
        submitted: parallel(['D1 -->|yes| X1((Upstream pod loss))']),
        submission: submit([], {
          traversals: [
            { tree_id: TREE_ID, visited_path: ['S1', 'E1', 'D1', { id: 'X1', condition: 'yes' }] },
          ],
        }),
        causalConfirmed: false,
      })
    );

    expect(graded.score).toBe(0);
    expect(graded.explanation).toContain('edge D1 -->|no| X1 was removed');
  });

  it('fails when a walked branch is rerouted and no longer reaches its old target', () => {
    const rerouted = PRIOR.replace(
      'D1 -->|yes| E2[Correlate with the upstream pod]',
      'D1 -->|yes| E4[Check the upstream pod lifecycle]\n    E4 --> D2\n    E2[Correlate with the upstream pod]'
    );

    const graded = checkStructurePreserved(
      context({
        submitted: rerouted,
        submission: submit([], {
          traversals: [{ tree_id: TREE_ID, visited_path: ['S1', 'E1', 'D1', 'E4', 'D2', 'X1'] }],
        }),
        causalConfirmed: false,
      })
    );

    expect(graded.score).toBe(0);
    expect(graded.explanation).toContain('edge D1 -->|yes| E2 was removed');
  });

  it('passes when a merged node is removed', () => {
    const duplicate = tree([
      'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
      'E1 --> D1{{Errors point at one upstream?}}',
      'D1 -->|yes| E2[Correlate with the upstream pod]',
      'D1 -->|yes| E4[Check the upstream pod restarts]',
      'E4 --> X1((Upstream pod loss))',
      'E2 --> X1',
      'D1 -->|no| X2((Gateway fault))',
    ]);
    const merged = tree([
      'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
      'E1 --> D1{{Errors point at one upstream?}}',
      'D1 -->|yes| E2[Correlate with the upstream pod restarts]',
      'E2 --> X1((Upstream pod loss))',
      'D1 -->|no| X2((Gateway fault))',
    ]);

    const graded = checkStructurePreserved(
      context({
        prior: duplicate,
        submitted: merged,
        submission: submit([], {
          symptom_trees: [{ tree_id: TREE_ID, merged_nodes: [{ from: ['E4'], into: 'E2' }] }],
          traversals: [{ tree_id: TREE_ID, visited_path: ['S1', 'E1', 'D1'] }],
        }),
        causalConfirmed: false,
      })
    );

    expect(graded.explanation).not.toContain('E4');
    expect(graded.score).toBe(1);
  });

  it.each([
    [
      'a merge chained across attempts',
      tree([
        'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
        'E1 --> D1{{Errors point at one upstream?}}',
        'D1 -->|yes| E2[Correlate with the upstream pod]',
        'D1 -->|yes| E3[Check the upstream pod restarts]',
        'D1 -->|yes| E4[Check the upstream pod lifecycle]',
        'E2 --> X1((Upstream pod loss))',
        'E3 --> X1',
        'E4 --> X1',
        'D1 -->|no| X2((Gateway fault))',
      ]),
      tree([
        'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
        'E1 --> D1{{Errors point at one upstream?}}',
        'D1 -->|yes| E4[Check the upstream pod lifecycle]',
        'E4 --> X1((Upstream pod loss))',
        'D1 -->|no| X2((Gateway fault))',
      ]),
      [
        { from: ['E2'], into: 'E3' },
        { from: ['E3'], into: 'E4' },
      ],
    ],
    [
      'a merge that combines differently labelled edges',
      tree([
        'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
        'E1 --> D1{{Errors point at one upstream?}}',
        'D1 -->|pod named| E2[Correlate with the upstream pod]',
        'D1 -->|pod restarted| E3[Check the upstream pod restarts]',
        'E2 --> X1((Upstream pod loss))',
        'E3 --> X1',
        'D1 -->|no| X2((Gateway fault))',
      ]),
      tree([
        'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
        'E1 --> D1{{Errors point at one upstream?}}',
        'D1 -->|pod named or restarted| E3[Check the upstream pod restarts]',
        'E3 --> X1((Upstream pod loss))',
        'D1 -->|no| X2((Gateway fault))',
      ]),
      [{ from: ['E2'], into: 'E3' }],
    ],
  ])('passes %s', (_case, prior, submitted, merges) => {
    // One submit per merge, as a retry would send them.
    const submissions = merges.map((merge) =>
      submit([], {
        symptom_trees: [{ tree_id: TREE_ID, merged_nodes: [merge] }],
        traversals: [{ tree_id: TREE_ID, visited_path: ['S1', 'E1'] }],
      })
    );
    const base = context({ prior, submitted, causalConfirmed: false });

    const graded = checkStructurePreserved({
      ...base,
      output: { ...base.output, submissions },
    });

    expect(graded.explanation).toContain('keeps every node and edge');
    expect(graded.score).toBe(1);
  });

  it('fails when a merge drops an unrelated branch of the node that absorbed it', () => {
    const duplicate = tree([
      'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
      'E1 --> D2{{Errors stop after the pod is replaced?}}',
      'E1 --> D3{{Errors stop after the pod restarts?}}',
      'D2 -->|yes| X1((Upstream pod loss))',
      'D2 -->|no| X2((Upstream fault persists))',
      'D3 -->|yes| X1',
      'E1 --> X2',
    ]);
    const merged = tree([
      'S1([Otel delivery gateway errors]) --> E1[Check gateway error logs]',
      'E1 --> D2{{Errors stop after the pod is replaced?}}',
      'D2 -->|yes| X1((Upstream pod loss))',
      'E1 --> X2((Upstream fault persists))',
    ]);

    const graded = checkStructurePreserved(
      context({
        prior: duplicate,
        submitted: merged,
        submission: submit([], {
          symptom_trees: [{ tree_id: TREE_ID, merged_nodes: [{ from: ['D3'], into: 'D2' }] }],
          traversals: [{ tree_id: TREE_ID, visited_path: ['S1', 'E1'] }],
        }),
        causalConfirmed: false,
      })
    );

    expect(graded.score).toBe(0);
    expect(graded.explanation).toContain('edge D2 -->|no| X2 was removed');
    expect(graded.explanation).not.toContain('D3');
  });

  it('passes a round that seeded no tree', () => {
    expect(
      checkStructurePreserved(
        context({ submitted: CONFIRMED, causalConfirmed: false, seeded: false })
      ).score
    ).toBe(1);
  });
});

describe('checkReinforcementDetected', () => {
  const write = (action: string): AppliedWrite => ({
    store: 'decision_tree',
    item_id: TREE_ID,
    action,
  });

  it('fails a confirmed round on a seeded tree without a reinforce write', () => {
    const graded = checkReinforcementDetected(
      context({ submitted: CONFIRMED, causalConfirmed: true, writes: [write('update')] })
    );

    expect(graded.score).toBe(0);
    expect(graded.explanation).toContain(`${TREE_ID}: update`);
  });

  it('passes a confirmed round whose write reinforced the seeded tree', () => {
    expect(
      checkReinforcementDetected(
        context({ submitted: CONFIRMED, causalConfirmed: true, writes: [write('reinforce')] })
      ).score
    ).toBe(1);
  });

  it('fails an unconfirmed round that reinforced any tree', () => {
    const otherTree: AppliedWrite = { ...write('reinforce'), item_id: NEW_TREE_ID };

    for (const writes of [[write('reinforce')], [write('update'), otherTree]]) {
      expect(
        checkReinforcementDetected(context({ submitted: PRIOR, causalConfirmed: false, writes }))
          .score
      ).toBe(0);
    }
  });
});
