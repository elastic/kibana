/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Crypto from 'crypto';
import Fs from 'fs';
import Path from 'path';
import type { InvestigationExample } from '@kbn/evals-suite-nightshift-investigations/evals/investigation/types';
import { getOrcaCutoff } from '@kbn/evals-suite-nightshift-investigations/evals/investigation/orca_cutoff';
import { harnessPaths } from './paths';
import { readEvaluationsKibana } from './secrets';

/** `nightshift/orca-bench-public755-v2`: every public ORCA task, the search/gate/sealed pool. */
export const PUBLIC755 = {
  id: '7e7dd22d-83fb-54a5-9e51-dd2b67def0ef',
  name: 'nightshift/orca-bench-public755-v2',
  examples: 755,
} as const;

export type Split = 'search' | 'gate' | 'sealed';

export interface OrcaTask {
  /** The example id in Golden. */
  id: string;
  caseId: string;
  /**
   * The incident the task was cut from. Tasks of one incident differ only in granularity and
   * offset, so they are one cluster for the bootstrap and one unit for the split.
   */
  incident: string;
  control: boolean;
  cutoff: string;
  tier: string;
  example: InvestigationExample;
}

interface StoredExample {
  id: string;
  input: InvestigationExample['input'];
  output?: InvestigationExample['output'];
  metadata: InvestigationExample['metadata'] & {
    orca_incident?: string;
    telemetry_snapshot_time?: string;
    no_incident?: boolean;
    orca_difficulty?: string;
  };
}

const sha = (value: string): string => Crypto.createHash('sha256').update(value).digest('hex');

const datasetPath = () => Path.join(harnessPaths().datasetsDir, 'public755-v2.json');

/** Downloads the release once; every later run reads the same bytes. */
export const ensureDataset = async (): Promise<string> => {
  const path = datasetPath();
  if (Fs.existsSync(path)) return path;
  const { url, apiKey } = readEvaluationsKibana();
  const response = await fetch(`${url}/internal/evals/datasets/${PUBLIC755.id}?per_page=1000`, {
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      'elastic-api-version': '1',
      'x-elastic-internal-origin': 'kibana',
      'kbn-xsrf': 'harness-opt',
    },
  });
  if (!response.ok) {
    throw new Error(`Downloading ${PUBLIC755.name} returned HTTP ${response.status}`);
  }
  const body = (await response.json()) as { examples?: StoredExample[] };
  if (body.examples?.length !== PUBLIC755.examples) {
    throw new Error(`${PUBLIC755.name} returned ${body.examples?.length} examples`);
  }
  Fs.mkdirSync(Path.dirname(path), { recursive: true });
  Fs.writeFileSync(path, JSON.stringify(body));
  return path;
};

export const loadTasks = (): OrcaTask[] => {
  const { examples } = JSON.parse(Fs.readFileSync(datasetPath(), 'utf8')) as {
    examples: StoredExample[];
  };
  return examples.map(({ id, input, output, metadata }) => {
    const incident = metadata.orca_incident;
    const cutoff = metadata.telemetry_snapshot_time;
    if (!incident || !cutoff) {
      throw new Error(`${metadata.case_id} has no orca_incident or telemetry_snapshot_time`);
    }
    return {
      id,
      caseId: metadata.case_id,
      incident,
      control: metadata.no_incident === true,
      // Normalised with milliseconds: Elasticsearch rounds a `lte` date without them up to the end
      // of the second, so the raw "…:42Z" let the key read documents from 42.001 to 42.999.
      cutoff: getOrcaCutoff({ metadata }),
      tier: metadata.orca_difficulty ?? 'unknown',
      example: { input, output, metadata } as InvestigationExample,
    };
  });
};

/**
 * The customer0 holdout: graded Elastic Cloud production incidents, never shown to the proposer.
 * The two newest curated releases; earlier ones are mostly the same incidents under other names.
 */
export const CUSTOMER0_HOLDOUT = [
  { id: '9b9e96e4-7cea-5dae-a706-476c4627dce2', name: 'ns-investigation-golden-2710' },
  { id: '3d2e3f66-e750-5db1-81b4-3364ca862ca6', name: 'ns-investigation-golden-0911' },
] as const;

const holdoutPath = () => Path.join(harnessPaths().datasetsDir, 'customer0-holdout.json');

/** Downloads the holdout once (owner-readable only: these are real incidents). */
export const ensureCustomer0Holdout = async (): Promise<string> => {
  const path = holdoutPath();
  if (Fs.existsSync(path)) return path;
  const { url, apiKey } = readEvaluationsKibana();
  const byCase = new Map<string, StoredExample & { dataset: string }>();
  for (const { id, name } of CUSTOMER0_HOLDOUT) {
    const response = await fetch(`${url}/internal/evals/datasets/${id}?per_page=1000`, {
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'elastic-api-version': '1',
        'x-elastic-internal-origin': 'kibana',
        'kbn-xsrf': 'harness-opt',
      },
    });
    if (!response.ok) throw new Error(`Downloading ${name} returned HTTP ${response.status}`);
    const { examples = [] } = (await response.json()) as { examples?: StoredExample[] };
    if (examples.length === 0) throw new Error(`${name} has no examples`);
    for (const example of examples) {
      const reference = (example.output as { reference_answer?: unknown } | undefined)
        ?.reference_answer;
      if (typeof reference !== 'string' || !reference.trim()) {
        throw new Error(`${name} example ${example.metadata.case_id} has no reference answer`);
      }
      // The later release wins: it is the corrected version of a case both carry.
      byCase.set(example.metadata.case_id, { ...example, dataset: name });
    }
  }
  Fs.mkdirSync(Path.dirname(path), { recursive: true });
  Fs.writeFileSync(path, JSON.stringify({ examples: [...byCase.values()] }), { mode: 0o600 });
  return path;
};

export const loadCustomer0Tasks = ({ limit }: { limit?: number } = {}): OrcaTask[] => {
  const { examples } = JSON.parse(Fs.readFileSync(holdoutPath(), 'utf8')) as {
    examples: Array<StoredExample & { dataset: string }>;
  };
  const tasks = examples
    .map(({ id, input, output, metadata, dataset }) => ({
      id,
      caseId: metadata.case_id,
      incident: metadata.case_id,
      control: false,
      cutoff: '',
      tier: dataset,
      example: { input, output, metadata } as InvestigationExample,
    }))
    .sort((a, b) => sha(a.caseId).localeCompare(sha(b.caseId)));
  return limit ? tasks.slice(0, limit) : tasks;
};

/** Share of incidents per split, in rank order of their hash. */
const SPLIT_SHARES: ReadonlyArray<[Split, number]> = [
  ['search', 0.4],
  ['gate', 0.35],
  ['sealed', 0.25],
];

/**
 * Incident → split. Ranked by a salted hash and cut by share, rather than thresholding each hash:
 * with 36 incidents, thresholding lands anywhere from 10 to 20 incidents in a split.
 */
export const assignSplits = (tasks: OrcaTask[]): Map<string, Split> => {
  const incidents = [...new Set(tasks.map(({ incident }) => incident))].sort((a, b) =>
    sha(`nightshift-harness-opt:${a}`).localeCompare(sha(`nightshift-harness-opt:${b}`))
  );
  const splits = new Map<string, Split>();
  let start = 0;
  SPLIT_SHARES.forEach(([split, share], position) => {
    const end =
      position === SPLIT_SHARES.length - 1
        ? incidents.length
        : start + Math.round(share * incidents.length);
    for (const incident of incidents.slice(start, end)) splits.set(incident, split);
    start = end;
  });
  return splits;
};

/**
 * A small, deterministic subset of a split, at most one task per incident.
 *
 * Tasks of one telemetry cutoff run together and cutoffs run one after another (one connector per
 * space), so a small subset is drawn from the largest cutoff groups first: four tasks on one cutoff
 * take one investigation's wall clock, four on four cutoffs take four.
 */
export const tasksForSplit = (
  split: Split,
  { limit, controlShare = 0.25 }: { limit?: number; controlShare?: number } = {}
): OrcaTask[] => {
  const tasks = loadTasks();
  const splits = assignSplits(tasks);
  const inSplit = tasks
    .filter((task) => splits.get(task.incident) === split)
    .sort((a, b) => sha(a.caseId).localeCompare(sha(b.caseId)));
  if (!limit || limit >= inSplit.length) return inSplit;
  // Controls are drawn separately, a quarter of the subset by default: drawn together with
  // incidents they never make it in (they are a sixth of the pool), and without them nothing in
  // the reward pushes back on an agent that claims an incident every time.
  const controlCount = Math.round(limit * controlShare);
  return [
    ...pickSubset(
      inSplit.filter((task) => !task.control),
      limit - controlCount
    ),
    ...pickSubset(
      inSplit.filter((task) => task.control),
      controlCount
    ),
  ];
};

/** At most one task per incident, largest cutoff groups first, difficulties alternating. */
const pickSubset = (inSplit: OrcaTask[], limit: number): OrcaTask[] => {
  if (limit <= 0) return [];

  const byCutoff = new Map<string, OrcaTask[]>();
  for (const task of inSplit)
    byCutoff.set(task.cutoff, [...(byCutoff.get(task.cutoff) ?? []), task]);
  // Inside a group, alternate tiers: the last snapshot is mostly `universal` tasks that name every
  // flag of the day, and a subset of only those saturates at reward 1.
  const rotateTiers = (group: OrcaTask[]): OrcaTask[] => {
    const byTier = new Map<string, OrcaTask[]>();
    for (const task of group) {
      const key = task.control ? 'control' : String(task.example.metadata.difficulty);
      byTier.set(key, [...(byTier.get(key) ?? []), task]);
    }
    const queues = [...byTier.values()];
    const rotated: OrcaTask[] = [];
    while (queues.some((queue) => queue.length > 0)) {
      for (const queue of queues) {
        const next = queue.shift();
        if (next) rotated.push(next);
      }
    }
    return rotated;
  };
  const groups = [...byCutoff.values()].sort((a, b) => b.length - a.length).map(rotateTiers);

  const chosen: OrcaTask[] = [];
  const usedIncidents = new Set<string>();
  for (const group of groups) {
    for (const task of group) {
      if (chosen.length >= limit) return chosen;
      if (usedIncidents.has(task.incident)) continue;
      usedIncidents.add(task.incident);
      chosen.push(task);
    }
  }
  return chosen;
};

export const describeSplits = (): string => {
  const tasks = loadTasks();
  const splits = assignSplits(tasks);
  return (['search', 'gate', 'sealed'] as const)
    .map((split) => {
      const inSplit = tasks.filter((task) => splits.get(task.incident) === split);
      const incidents = new Set(inSplit.map(({ incident }) => incident));
      const controls = inSplit.filter(({ control }) => control).length;
      const tiers = inSplit.reduce<Record<string, number>>(
        (counts, { tier }) => ({ ...counts, [tier]: (counts[tier] ?? 0) + 1 }),
        {}
      );
      return `${split}: ${incidents.size} incidents, ${
        inSplit.length
      } tasks (${controls} controls), tiers ${JSON.stringify(tiers)}`;
    })
    .join('\n');
};
