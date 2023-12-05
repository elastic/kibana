/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findIndex, flatMap, flatten } from 'lodash';
import * as diff from 'diff';
import type { Change } from 'diff';
import { isDelete, isInsert, isNormal, pickRanges } from 'react-diff-view';
import type { ChangeData, HunkData, RangeTokenNode, TokenizeEnhancer } from 'react-diff-view';

enum DmpChangeType {
  DELETE = -1,
  EQUAL = 0,
  INSERT = 1,
}

type Diff = [DmpChangeType, string];

type StringDiffFn = (oldString: string, newString: string) => Change[];

interface JsDiff {
  diffChars: StringDiffFn;
  diffWords: StringDiffFn;
  diffWordsWithSpace: StringDiffFn;
  diffLines: StringDiffFn;
  diffTrimmedLines: StringDiffFn;
  diffSentences: StringDiffFn;
  diffCss: StringDiffFn;
}

const jsDiff: JsDiff = diff;

export enum DiffMethod {
  CHARS = 'diffChars',
  WORDS = 'diffWords',
  WORDS_WITH_SPACE = 'diffWordsWithSpace',
  LINES = 'diffLines',
  TRIMMED_LINES = 'diffTrimmedLines',
  SENTENCES = 'diffSentences',
  CSS = 'diffCss',
}

function findChangeBlocks(changes: ChangeData[]): ChangeData[][] {
  const start = findIndex(changes, (change) => !isNormal(change));

  if (start === -1) {
    return [];
  }

  const end = findIndex(changes, (change) => !!isNormal(change), start);

  if (end === -1) {
    return [changes.slice(start)];
  }

  return [changes.slice(start, end), ...findChangeBlocks(changes.slice(end))];
}

function groupDiffs(diffs: Diff[]): [Diff[], Diff[]] {
  return diffs.reduce<[Diff[], Diff[]]>(
    // eslint-disable-next-line @typescript-eslint/no-shadow
    ([oldDiffs, newDiffs], diff) => {
      const [type] = diff;

      switch (type) {
        case DmpChangeType.INSERT:
          newDiffs.push(diff);
          break;
        case DmpChangeType.DELETE:
          oldDiffs.push(diff);
          break;
        default:
          oldDiffs.push(diff);
          newDiffs.push(diff);
          break;
      }

      return [oldDiffs, newDiffs];
    },
    [[], []]
  );
}

function splitDiffToLines(diffs: Diff[]): Diff[][] {
  return diffs.reduce<Diff[][]>(
    (lines, [type, value]) => {
      const currentLines = value.split('\n');

      const [currentLineRemaining, ...nextLines] = currentLines.map(
        (line: string): Diff => [type, line]
      );
      const next: Diff[][] = [
        ...lines.slice(0, -1),
        [...lines[lines.length - 1], currentLineRemaining],
        ...nextLines.map((line) => [line]),
      ];
      return next;
    },
    [[]]
  );
}

function diffsToEdits(diffs: Diff[], lineNumber: number): RangeTokenNode[] {
  const output = diffs.reduce<[RangeTokenNode[], number]>(
    // eslint-disable-next-line @typescript-eslint/no-shadow
    (output, diff) => {
      const [edits, start] = output;
      const [type, value] = diff;
      if (type !== DmpChangeType.EQUAL) {
        const edit: RangeTokenNode = {
          type: 'edit',
          lineNumber,
          start,
          length: value.length,
        };
        edits.push(edit);
      }

      return [edits, start + value.length];
    },
    [[], 0]
  );

  return output[0];
}

function convertToLinesOfEdits(linesOfDiffs: Diff[][], startLineNumber: number) {
  return flatMap(linesOfDiffs, (diffs, i) => diffsToEdits(diffs, startLineNumber + i));
}

function diffBy(diffMethod: DiffMethod, oldSource: string, newSource: string): [Diff[], Diff[]] {
  const jsDiffChanges: Change[] = jsDiff[diffMethod](oldSource, newSource);
  const diffs: Diff[] = diff.convertChangesToDMP(jsDiffChanges);

  if (diffs.length <= 1) {
    return [[], []];
  }

  return groupDiffs(diffs);
}

const getLineNumber = (change: ChangeData | undefined) => {
  if (!change || isNormal(change)) {
    return undefined;
  }

  return change.lineNumber;
};

function diffChangeBlock(
  changes: ChangeData[],
  diffMethod: DiffMethod
): [RangeTokenNode[], RangeTokenNode[]] {
  /* Convert ChangeData array to two strings representing old source and new source of a change block, like
  
  "created_at": "2023-11-20T16:47:52.801Z",
  "created_by": "elastic",
  ...
  
  and

  "created_at": "1970-01-01T00:00:00.000Z",
  "created_by": "",
  ...
  */
  const [oldSource, newSource] = changes.reduce(
    // eslint-disable-next-line @typescript-eslint/no-shadow
    ([oldSource, newSource], change) =>
      isDelete(change)
        ? [oldSource + (oldSource ? '\n' : '') + change.content, newSource]
        : [oldSource, newSource + (newSource ? '\n' : '') + change.content],
    ['', '']
  );

  const [oldDiffs, newDiffs] = diffBy(diffMethod, oldSource, newSource);

  if (oldDiffs.length === 0 && newDiffs.length === 0) {
    return [[], []];
  }

  const oldStartLineNumber = getLineNumber(changes.find(isDelete));
  const newStartLineNumber = getLineNumber(changes.find(isInsert));

  if (oldStartLineNumber === undefined || newStartLineNumber === undefined) {
    throw new Error('Could not find start line number for edit');
  }

  const oldEdits = convertToLinesOfEdits(splitDiffToLines(oldDiffs), oldStartLineNumber);
  const newEdits = convertToLinesOfEdits(splitDiffToLines(newDiffs), newStartLineNumber);

  return [oldEdits, newEdits];
}

export function markEdits(hunks: HunkData[], diffMethod: DiffMethod): TokenizeEnhancer {
  const changeBlocks = flatMap(
    hunks.map((hunk) => hunk.changes),
    findChangeBlocks
  );

  const [oldEdits, newEdits] = changeBlocks
    .map((changes) => diffChangeBlock(changes, diffMethod))
    .reduce(
      // eslint-disable-next-line @typescript-eslint/no-shadow
      ([oldEdits, newEdits], [currentOld, currentNew]) => [
        oldEdits.concat(currentOld),
        newEdits.concat(currentNew),
      ],
      [[], []]
    );

  return pickRanges(flatten(oldEdits), flatten(newEdits));
}
