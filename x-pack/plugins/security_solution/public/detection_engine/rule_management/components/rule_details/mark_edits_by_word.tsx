/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findIndex, flatMap, flatten } from 'lodash';
import DiffMatchPatch from 'diff-match-patch';
import type { Diff } from 'diff-match-patch';
import 'diff-match-patch-line-and-word';
import * as diff from 'diff';
import type { Change } from 'diff';
import { isDelete, isInsert, isNormal, pickRanges } from 'react-diff-view';
import type { ChangeData, HunkData, RangeTokenNode, TokenizeEnhancer } from 'react-diff-view';

interface JsDiff {
  diffChars: (oldStr: string, newStr: string) => Change[];
  diffWords: (oldStr: string, newStr: string) => Change[];
  diffWordsWithSpace: (oldStr: string, newStr: string) => Change[];
  diffLines: (oldStr: string, newStr: string) => Change[];
  diffTrimmedLines: (oldStr: string, newStr: string) => Change[];
  diffSentences: (oldStr: string, newStr: string) => Change[];
  diffCss: (oldStr: string, newStr: string) => Change[];
  diffJson: (oldObject: Record<string, unknown>, newObject: Record<string, unknown>) => Change[];
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
  JSON = 'diffJson',
  WORDS_CUSTOM_USING_DMP = 'diffWordsCustomUsingDmp',
}

const { DIFF_EQUAL, DIFF_DELETE, DIFF_INSERT } = DiffMatchPatch;

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
        case DIFF_INSERT:
          newDiffs.push(diff);
          break;
        case DIFF_DELETE:
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
        ...nextLines.map((line: string) => [line]),
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
      if (type !== DIFF_EQUAL) {
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

/*
  UPDATE: I figured that there's a way to do it without relying on "diff-match-patch-line-and-word".
  See a new function "diffBy" below. Leaving this function here for comparison.
*/
function diffByWord(x: string, y: string): [Diff[], Diff[]] {
  /*
    This is a modified version of "diffText" from react-diff-view.
    Original: https://github.com/otakustay/react-diff-view/blob/49cebd0958ef323c830395c1a1da601560a71781/src/tokenize/markEdits.ts#L96
  */
  const dmp = new DiffMatchPatch();
  /*
    "diff_wordMode" comes from "diff-match-patch-line-and-word".
    "diff-match-patch-line-and-word" adds word-level diffing to Google's "diff-match-patch" lib by
    adding a new method "diff_wordMode" to the prototype of DiffMatchPatch.
    There's an instruction how to do it in the "diff-match-patch" docs and somebody just made it into a package.
    https://github.com/google/diff-match-patch/wiki/Line-or-Word-Diffs#word-mode
  */
  const diffs = dmp.diff_wordMode(x, y);

  if (diffs.length <= 1) {
    return [[], []];
  }

  return groupDiffs(diffs);
}

function diffBy(diffMethod: DiffMethod, x: string, y: string): [Diff[], Diff[]] {
  const jsDiffChanges: Change[] = jsDiff[diffMethod](x, y);
  const diffs: Diff[] = diff.convertChangesToDMP(jsDiffChanges);

  if (diffs.length <= 1) {
    return [[], []];
  }

  return groupDiffs(diffs);
}

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

  const [oldDiffs, newDiffs] =
    diffMethod === DiffMethod.WORDS_CUSTOM_USING_DMP // <-- That's basically the only change I made to allow word-level diffing
      ? diffByWord(oldSource, newSource)
      : diffBy(diffMethod, oldSource, newSource);

  if (oldDiffs.length === 0 && newDiffs.length === 0) {
    return [[], []];
  }

  const getLineNumber = (change: ChangeData | undefined) => {
    if (!change || isNormal(change)) {
      return undefined;
    }

    return change.lineNumber;
  };
  const oldStartLineNumber = getLineNumber(changes.find(isDelete));
  const newStartLineNumber = getLineNumber(changes.find(isInsert));

  if (oldStartLineNumber === undefined || newStartLineNumber === undefined) {
    throw new Error('Could not find start line number for edit');
  }

  const oldEdits = convertToLinesOfEdits(splitDiffToLines(oldDiffs), oldStartLineNumber);
  const newEdits = convertToLinesOfEdits(splitDiffToLines(newDiffs), newStartLineNumber);

  return [oldEdits, newEdits];
}

export function markEditsBy(hunks: HunkData[], diffMethod: DiffMethod): TokenizeEnhancer {
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
