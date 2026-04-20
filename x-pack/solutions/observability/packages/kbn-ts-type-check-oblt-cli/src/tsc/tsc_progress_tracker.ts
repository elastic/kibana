/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SingleBar } from 'cli-progress';
import stripAnsi from 'strip-ansi';

const BAR_REFRESH_INTERVAL_MS = 1_000;
const LOG_PROGRESS_INTERVAL_MS = 5_000;

function isInteractiveTty(): boolean {
  return Boolean(process.stdout.isTTY);
}

/**
 * Tracks progress of a `tsc --verbose` run by parsing its output line-by-line
 * and either driving a `cli-progress` bar (TTY) or emitting periodic log lines
 * (non-TTY, e.g. agents or piped output).
 *
 * Progress is tracked by counting two kinds of tsc verbose messages:
 *   - "Building project '...'"       (project needs to be compiled)
 *   - "Project '...' is up to date"  (project skipped, already current)
 *
 * The total project count is extracted from the "Projects in this build:"
 * header that tsc prints at the very start of --verbose output.
 *
 * Error and diagnostic lines are buffered and replayed via `printErrors()`
 * after the bar finishes.
 */
export class TscProgressTracker {
  private totalProjects = 0;
  private completedProjects = 0;
  private builtProjects = 0;
  private skippedProjects = 0;
  private errorCount = 0;
  private parsingProjectList = false;
  private barStarted = false;
  private readonly errorLines: string[] = [];
  private readonly builtProjectTimings: Array<{ name: string; path: string; ms: number }> = [];
  /** Wall-clock time when the current "Building project" started, or null if none in progress. */
  private currentBuildStart: number | null = null;
  private currentBuildName: string | null = null;
  private currentBuildPath: string | null = null;
  private readonly startTime = Date.now();
  private timer: ReturnType<typeof setInterval> | null = null;

  private readonly bar?: SingleBar;
  private readonly logInfo?: (msg: string) => void;
  private readonly passLabel: string;

  constructor(options: { logInfo?: (msg: string) => void; passLabel?: string } = {}) {
    this.logInfo = options.logInfo;
    this.passLabel = options.passLabel ?? '';

    if (isInteractiveTty()) {
      this.bar = new SingleBar({
        barsize: 30,
        format:
          ' Type checking [{bar}] {value}/{total} projects | {elapsed} | {built} needed to be rechecked | {errors} errors found | Checking {project}',
        hideCursor: true,
        clearOnComplete: true,
      });
    }
  }

  /** Close the in-progress build timer, recording elapsed ms for the current project. */
  private closeBuildTimer() {
    if (this.currentBuildStart !== null && this.currentBuildName !== null) {
      this.builtProjectTimings.push({
        name: this.currentBuildName,
        path: this.currentBuildPath ?? this.currentBuildName,
        ms: Date.now() - this.currentBuildStart,
      });
    }
    this.currentBuildStart = null;
    this.currentBuildName = null;
    this.currentBuildPath = null;
  }

  private formatElapsed(): string {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return mins > 0 ? `${mins}m ${secs.toString().padStart(2, '0')}s` : `${secs}s`;
  }

  private emitLogLine() {
    if (!this.logInfo || this.totalProjects === 0) return;
    const pct = Math.round((this.completedProjects / this.totalProjects) * 100);
    const label = this.passLabel ? `[${this.passLabel}] ` : '';
    this.logInfo(
      `[TypeCheck] ${label}` +
        `${this.completedProjects} / ${this.totalProjects} projects (${pct}%) — ` +
        `${this.builtProjects} rebuilt, ${
          this.skippedProjects
        } up-to-date | ${this.formatElapsed()} elapsed`
    );
  }

  /** Start the elapsed-time tick so progress updates even between project completions. */
  start() {
    if (isInteractiveTty()) {
      // Bar mode: tick every second to keep the elapsed counter fresh.
      this.timer = setInterval(() => {
        if (this.barStarted) {
          this.bar!.update({ elapsed: this.formatElapsed() });
        }
      }, BAR_REFRESH_INTERVAL_MS);
    } else {
      // Log mode: emit a plain-text progress line every LOG_PROGRESS_INTERVAL_MS.
      this.timer = setInterval(() => {
        this.emitLogLine();
      }, LOG_PROGRESS_INTERVAL_MS);
    }
  }

  /** Feed a stdout line from tsc into the tracker. */
  processLine(line: string) {
    const plain = stripAnsi(line);

    // Detect the project list header and count entries.
    // tsc --verbose output starts with:
    //   [HH:MM:SS] Projects in this build:
    //       * path/to/tsconfig.json
    //       * path/to/tsconfig2.json
    //   ...
    if (plain.includes('Projects in this build:')) {
      this.parsingProjectList = true;
      this.totalProjects = 0;
      return;
    }

    if (this.parsingProjectList) {
      if (/^\s+\*\s+/.test(plain)) {
        this.totalProjects++;
        return;
      }
      // First non-"*" line after the header ends the project list.
      this.parsingProjectList = false;

      if (this.totalProjects > 0 && !this.barStarted && this.bar) {
        this.bar.start(this.totalProjects, 0, {
          elapsed: this.formatElapsed(),
          project: '',
          status: '',
          built: 0,
          skipped: 0,
          errors: 0,
        });
        this.barStarted = true;
      }
    }

    // Track per-project progress.
    const buildingMatch = plain.match(/Building project '([^']+)'/);
    if (buildingMatch) {
      // Close the previous build's timer before starting a new one.
      this.closeBuildTimer();
      this.currentBuildName = extractProjectName(buildingMatch[1]);
      this.currentBuildPath = buildingMatch[1];
      this.currentBuildStart = Date.now();

      this.completedProjects++;
      this.builtProjects++;
      if (this.bar && this.barStarted) {
        this.bar.update(this.completedProjects, {
          elapsed: this.formatElapsed(),
          project: this.currentBuildName,
          status: 'checking',
          built: this.builtProjects,
          skipped: this.skippedProjects,
        });
      }
      return;
    }

    const upToDateMatch = plain.match(/Project '([^']+)' is up to date/);
    if (upToDateMatch) {
      // An up-to-date project means the previous build (if any) has finished.
      this.closeBuildTimer();

      this.completedProjects++;
      this.skippedProjects++;
      if (this.bar && this.barStarted) {
        this.bar.update(this.completedProjects, {
          elapsed: this.formatElapsed(),
          project: extractProjectName(upToDateMatch[1]),
          status: 'cache hit - no rebuild needed',
          built: this.builtProjects,
          skipped: this.skippedProjects,
        });
      }
      return;
    }

    // Collect error / diagnostic lines (anything that isn't verbose noise).
    // Skip timestamp-only verbose lines that don't carry useful info.
    const trimmed = plain.trim();
    if (trimmed.length > 0 && !isVerboseNoise(trimmed)) {
      this.errorLines.push(line);
      if (/\berror TS\d+:/.test(plain)) {
        this.errorCount++;
        if (this.bar && this.barStarted) {
          this.bar.update({ errors: this.errorCount });
        }
      }
    }
  }

  /** Feed a stderr line from tsc into the tracker. */
  addStderrLine(line: string) {
    this.errorLines.push(line);
    const plain = stripAnsi(line);
    if (/\berror TS\d+:/.test(plain)) {
      this.errorCount++;
      if (this.bar && this.barStarted) {
        this.bar.update({ errors: this.errorCount });
      }
    }
  }

  /** Stop the timer and finalize the progress bar or emit a final log line. */
  stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Close the last in-progress build (tsc doesn't emit a trailing line after the final project).
    this.closeBuildTimer();
    if (this.bar && this.barStarted) {
      this.bar.update(this.totalProjects, { elapsed: this.formatElapsed() });
      this.bar.stop();
    }
  }

  /** Replay any buffered error / diagnostic output to stdout. */
  printErrors() {
    for (const line of this.errorLines) {
      process.stdout.write(line + '\n');
    }
  }

  getSummary() {
    return {
      totalProjects: this.totalProjects,
      completedProjects: this.completedProjects,
      builtProjects: this.builtProjects,
      skippedProjects: this.skippedProjects,
      errorCount: this.errorCount,
      elapsed: this.formatElapsed(),
      builtProjectTimings: [...this.builtProjectTimings],
    };
  }
}

/**
 * Extract a short, human-friendly project name from a tsconfig path.
 *
 * Examples:
 *   "src/platform/packages/shared/kbn-std/tsconfig.type_check.json"  -> "kbn-std"
 *   "x-pack/solutions/observability/plugins/apm/tsconfig.type_check.json" -> "apm"
 *   "tsconfig.type_check.json" -> "tsconfig.type_check.json"
 */
const extractProjectName = (configPath: string): string => {
  const parts = configPath.replace(/\\/g, '/').split('/');
  // The directory immediately before the tsconfig file is the package/plugin name.
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return configPath;
};

/**
 * Returns true for tsc --verbose lines that are informational noise
 * (not errors, not progress). These are suppressed from output.
 */
const isVerboseNoise = (plain: string): boolean => {
  // Timestamp-prefixed verbose messages we want to hide
  if (/^\[?\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?\]?\s/.test(plain)) {
    return true;
  }
  // The "Projects in this build:" header and list items
  if (plain.includes('Projects in this build:') || /^\s+\*\s+/.test(plain)) {
    return true;
  }
  return false;
};
