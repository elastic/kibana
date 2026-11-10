/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFile } from 'child_process';
import Crypto from 'crypto';
import Fs from 'fs';
import Path from 'path';
import { promisify } from 'util';
import type { ToolingLog } from '@kbn/tooling-log';

const execFileAsync = promisify(execFile);

const PLUGIN_SERVER = 'x-pack/solutions/observability/plugins/nightshift_investigations/server';
export const INSTRUCTIONS_DIR = `${PLUGIN_SERVER}/agents/investigation/instructions`;
export const CONNECTOR_DOCS_DIR = `${PLUGIN_SERVER}/tools/sandbox_bash/connector_docs`;

/**
 * The files the optimizer may rewrite, first surface: the investigator prompt and the usage guides
 * seeded into `/workspace/.connector-docs/`. Explicit rather than a glob, so a new file anywhere
 * else is rejected rather than silently in scope. Wiki and decision-tree sections are left out:
 * both are off in the eval config, so edits to them could not be measured.
 */
export const EDITABLE_FILES: readonly string[] = [
  `${INSTRUCTIONS_DIR}/investigator.md.text`,
  `${CONNECTOR_DOCS_DIR}/elastic.md.text`,
  `${CONNECTOR_DOCS_DIR}/github.md.text`,
  `${CONNECTOR_DOCS_DIR}/newrelic.md.text`,
];

/** Directories `git status` / `git diff` / reset look at. */
const WATCHED_DIRS: readonly string[] = [INSTRUCTIONS_DIR, CONNECTOR_DOCS_DIR];

/** Placeholders `agents/investigation/index.ts` fills; dropping one silently drops a section. */
const REQUIRED_PLACEHOLDERS: Record<string, readonly string[]> = {
  [`${INSTRUCTIONS_DIR}/investigator.md.text`]: [
    '{{knowledge_wiki_section}}',
    '{{semantic_memory_section}}',
    '{{decision_trees_section}}',
  ],
};

export interface CodeEdit {
  path: string;
  content: string;
}

export interface Workspace {
  path: string;
}

const run = async (
  command: string,
  args: string[],
  cwd: string,
  timeoutMs = 1_800_000
): Promise<{ ok: boolean; output: string }> => {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,
      env: { ...process.env },
    });
    return { ok: true, output: `${stdout}\n${stderr}` };
  } catch (e) {
    const error = e as { stdout?: string; stderr?: string; message: string };
    return {
      ok: false,
      output: `${error.stdout ?? ''}\n${error.stderr ?? ''}\n${error.message}`.slice(-6000),
    };
  }
};

/** Structural limits only; judgements about intent belong to the reviewer. */
export const lintCodeEdits = (edits: CodeEdit[]): string[] => {
  const violations: string[] = [];
  for (const edit of edits) {
    if (!EDITABLE_FILES.includes(edit.path)) {
      violations.push(`${edit.path} is outside the editable surface`);
      continue;
    }
    if (edit.content.trim().length === 0) violations.push(`${edit.path} is empty`);
    if (edit.content.length > 60_000) {
      violations.push(`${edit.path}: implausibly large (${edit.content.length} chars)`);
    }
    for (const placeholder of REQUIRED_PLACEHOLDERS[edit.path] ?? []) {
      if (!edit.content.includes(placeholder)) {
        violations.push(`${edit.path} lost the ${placeholder} placeholder`);
      }
    }
  }
  return violations;
};

/** Discard every change to the editable surface, so a rejected round leaves no residue. */
export const resetWorkspace = async (workspace: Workspace): Promise<void> => {
  await run('git', ['checkout', 'HEAD', '--', ...WATCHED_DIRS], workspace.path);
  await run('git', ['clean', '-fd', '--', ...WATCHED_DIRS], workspace.path);
};

/** Identity of a variant: a hash of the editable files as they are on disk. */
export const treeHash = (worktreePath: string): string => {
  const hash = Crypto.createHash('sha256');
  for (const file of EDITABLE_FILES) {
    hash.update(file);
    const absolute = Path.join(worktreePath, file);
    hash.update(Fs.existsSync(absolute) ? Fs.readFileSync(absolute) : '');
  }
  return hash.digest('hex').slice(0, 10);
};

/** Every changed or new file under the watched directories, editable or not (lint rejects). */
export const collectEdits = async (workspace: Workspace): Promise<CodeEdit[]> => {
  const { output } = await run(
    'git',
    ['status', '--porcelain', '--untracked-files=all', '--', ...WATCHED_DIRS],
    workspace.path
  );
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[A-Z?!]+\s+/, ''))
    .filter((path) => path.startsWith('x-pack/'))
    .filter((path) => Fs.existsSync(Path.join(workspace.path, path)))
    .map((path) => ({ path, content: Fs.readFileSync(Path.join(workspace.path, path), 'utf8') }));
};

/** Unified diff of the editable surface, for the ledger, the reviewer and the report. */
export const workspaceDiff = async (workspace: Workspace): Promise<string> => {
  const { output } = await run('git', ['diff', 'HEAD', '--', ...WATCHED_DIRS], workspace.path);
  return output.trim().slice(0, 60_000);
};

export const writeEdits = ({ edits, worktree }: { edits: CodeEdit[]; worktree: string }): void => {
  for (const edit of edits) {
    const absolute = Path.join(worktree, edit.path);
    Fs.mkdirSync(Path.dirname(absolute), { recursive: true });
    Fs.writeFileSync(absolute, edit.content);
  }
};

/**
 * Lint, then run the tests that read these files. A text-only surface needs no type check; the
 * agent and connector-doc tests catch a prompt that no longer renders.
 */
export const validateEdits = async ({
  workspace,
  edits,
  log,
}: {
  workspace: Workspace;
  edits: CodeEdit[];
  log: ToolingLog;
}): Promise<{ ok: boolean; failures: string[] }> => {
  const violations = lintCodeEdits(edits);
  if (violations.length > 0) return { ok: false, failures: violations };

  const failures: string[] = [];
  for (const dir of [
    `${PLUGIN_SERVER}/agents/investigation`,
    `${PLUGIN_SERVER}/tools/sandbox_bash`,
  ]) {
    const result = await run('node', ['scripts/jest', dir], workspace.path);
    log.info(`[candidate] jest ${dir.split('/server/')[1]}: ${result.ok ? 'pass' : 'FAIL'}`);
    if (!result.ok) failures.push(`jest ${dir} failed:\n${result.output.slice(-1500)}`);
  }
  return { ok: failures.length === 0, failures };
};

/**
 * Restart a lane's Kibana and wait until it answers again. Seeing the port go down is the only
 * proof the old process is gone: a fast status check would otherwise succeed against the process
 * being replaced, and the round would measure the previous prompt.
 */
export const restartLane = async ({
  command,
  url,
  auth,
  log,
  timeoutMs = 900_000,
}: {
  command: string;
  url: string;
  /** `user:password`; without it `/api/status` answers 401 long before plugins are ready. */
  auth: string;
  log: ToolingLog;
  timeoutMs?: number;
}): Promise<boolean> => {
  const authorization = `Basic ${Buffer.from(auth).toString('base64')}`;
  // "Up" means every plugin reports available, not that the port answers.
  const isUp = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${url}/api/status`, {
        headers: { Authorization: authorization },
      });
      if (!response.ok) return false;
      const body = (await response.json()) as { status?: { overall?: { level?: string } } };
      return body.status?.overall?.level === 'available';
    } catch (e) {
      return false;
    }
  };
  const isListening = async (): Promise<boolean> => {
    try {
      await fetch(`${url}/api/status`);
      return true;
    } catch (e) {
      return false;
    }
  };
  log.info(`[lane] restarting ${url}`);
  // dev_stack's start waits for Kibana itself; the stop half is what makes "down" observable.
  const restarted = run('bash', ['-lc', command], process.cwd(), timeoutMs);

  const downDeadline = Date.now() + 180_000;
  let sawDown = false;
  while (Date.now() < downDeadline) {
    if (!(await isListening())) {
      sawDown = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!sawDown) {
    log.error(`[lane] ${url} never went down — refusing to measure possibly stale code`);
    return false;
  }
  const result = await restarted;
  if (!result.ok) log.warning(`[lane] restart command failed: ${result.output.slice(-800)}`);

  const upDeadline = Date.now() + timeoutMs;
  while (Date.now() < upDeadline) {
    if (await isUp()) {
      log.info(`[lane] ${url} is back`);
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  log.warning(`[lane] ${url} did not come back within the timeout`);
  return false;
};
