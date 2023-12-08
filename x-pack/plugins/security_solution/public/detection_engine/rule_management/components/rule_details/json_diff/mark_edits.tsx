/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findIndex, flatMap, flatten } from 'lodash';
import * as diff from 'diff';
import type { Change as DiffJsChange } from 'diff';
import { isDelete, isInsert, isNormal, pickRanges } from 'react-diff-view';
import type { ChangeData, HunkData, RangeTokenNode, TokenizeEnhancer } from 'react-diff-view';

enum DmpChangeType {
  DELETE = -1,
  EQUAL = 0,
  INSERT = 1,
}

type Diff = [DmpChangeType, string];

type StringDiffFn = (oldString: string, newString: string) => DiffJsChange[];

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

/**
 * @param {ChangeData[]} changes - An array representing the changes in the block.
 * Each hunk represents a section of a string and includes information about the changes in that section.
 * Sections normally span multiple lines.
 * @param {DiffMethod} diffMethod - Diffing algorithm to use for token extraction. For example, "diffWords" will tokenize the string into words.
 *
 * @returns {TokenizeEnhancer} A react-diff-view plugin that processes diff hunks and returns an array of tokens.
 * Tokens are then used to render "added" / "removed" diff highlighting.
 *
 * @description
 * Converts the given ChangeData array to two strings representing the old source and new source of a change block.
 * The format of the strings is as follows:
 */
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

/**
 * @param {Diff[]} diffs An array of changes in the diff-match-patch format
 * @returns {Diff[][]} An array of arrays, where changes are grouped by a line number.
 */
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

/**
 * @param {Diff[]} diffs An array of changes within a single line in the diff-match-patch format
 * @param {number} lineNumber Line number where the changes are found
 * @returns {RangeTokenNode[]} Array of "edit" objects where each item contains
 * info about line number and start / end character positions.
 */
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

/**
 * @param {Diff[][]} linesOfDiffs - Changes in a diff-match-patch format, grouped by a line number.
 * @param {number} startLineNumber - Line number of the first line.
 * @returns {RangeTokenNode[]} Flattened array of "edit" objects where each item contains
 * info about line number and start / end character positions.
 */
function convertToLinesOfEdits(linesOfDiffs: Diff[][], startLineNumber: number): RangeTokenNode[] {
  return flatMap(linesOfDiffs, (diffs, i) => diffsToEdits(diffs, startLineNumber + i));
}

/**
 * @param {DiffMethod} diffMethod - Diffing algorithm to use for token extraction.
 * @param {string} oldSource - A substring of the original source string.
 * @param {string} newSource - A corresponding substring of the new source string.
 * @returns {[Diff[], Diff[]]} Two arrays of changes in the diff-match-patch format.
 * Every item is a tuple of two values: [<change type: addition, deletion or unchanged>, <substring>].
 *
 * @description Runs two strings through the chosen diffing algorithm using the "diff" library to determine
 * which parts of the original string were added / removed / unchanged. Then returns an array of changes in
 * the diff-match-patch diff format.
 */
function diffBy(diffMethod: DiffMethod, oldSource: string, newSource: string): [Diff[], Diff[]] {
  /* Diff two substrings using the "diff" library */
  const jsDiffChanges: DiffJsChange[] = jsDiff[diffMethod](oldSource, newSource);
  /* Convert the result to the diff-match-patch format, because that's the format react-diff-view methods expect */
  const diffs: Diff[] = diff.convertChangesToDMP(jsDiffChanges);

  if (diffs.length <= 1) {
    return [[], []];
  }

  /* Split diff-match-patch formatted diffs into two arrays: one for the old source and one for the new source */
  return groupDiffs(diffs);
}

const getLineNumber = (change: ChangeData | undefined) => {
  if (!change || isNormal(change)) {
    return undefined;
  }

  return change.lineNumber;
};

/**
 * @param {ChangeData[]} changes - An array of сhange objects. Each change object represents changes in a single line.
 * @param {DiffMethod} diffMethod - Diffing algorithm to use for token extraction.
 * @returns {[RangeTokenNode[], RangeTokenNode[]]} A tuple containing two arrays of RangeTokenNodes - one for
 * the old source and another one for the new source. Each RangeTokenNode contains information about line numbers
 * and character positions of changes.
 *
 * @description This function processes change objects and determines exactly which segments of the orginal string changed.
 * It diffs old and new substrings and computes at which character position each change starts and ends,
 * taking the diffing algorithm into account (by char, by word, by sentence, etc.)
 */
function diffChangeBlock(
  changes: ChangeData[],
  diffMethod: DiffMethod
): [RangeTokenNode[], RangeTokenNode[]] {
  /*
    Convert an array of change objects into two strings representing the old source and the new source of a change block.
    Basically, recreate parts of the original strings from change objects so we can pass these strings to the text diffing library.
  */
  const [oldSourceSnippet, newSourceSnippet] = changes.reduce(
    // eslint-disable-next-line @typescript-eslint/no-shadow
    ([oldSourceSnippet, newSourceSnippet], change) =>
      isDelete(change)
        ? [oldSourceSnippet + (oldSourceSnippet ? '\n' : '') + change.content, newSourceSnippet]
        : [oldSourceSnippet, newSourceSnippet + (newSourceSnippet ? '\n' : '') + change.content],
    ['', '']
  );

  /*
   * Run the chosen diffing algorithm with an "old" and a "new" substrings as input.
   * The result is an array of changes in the diff-match-patch format.
   */
  const [oldDiffs, newDiffs] = diffBy(diffMethod, oldSourceSnippet, newSourceSnippet);

  if (oldDiffs.length === 0 && newDiffs.length === 0) {
    return [[], []];
  }

  const oldStartLineNumber = getLineNumber(changes.find(isDelete));
  const newStartLineNumber = getLineNumber(changes.find(isInsert));

  if (oldStartLineNumber === undefined || newStartLineNumber === undefined) {
    throw new Error('Could not find start line number for edit');
  }

  /*
   * Group changes by a line number they are found in, then determine start / end character
   * positions of each change.
   */
  const oldEdits = convertToLinesOfEdits(splitDiffToLines(oldDiffs), oldStartLineNumber);
  const newEdits = convertToLinesOfEdits(splitDiffToLines(newDiffs), newStartLineNumber);

  return [oldEdits, newEdits];
}

/**
 * @param {HunkData[]} hunks - An array of hunk objects.
 * Each hunk represents a section of a string and includes information about the changes in that section.
 * Sections normally span multiple lines.
 * @param {DiffMethod} diffMethod - Diffing algorithm to use for token extraction. For example, "diffWords" will tokenize the string into words.
 *
 * @returns {TokenizeEnhancer} A react-diff-view plugin that processes diff hunks and returns an array of tokens.
 * Tokens are then used to render "added" / "removed" diff highlighting.
 *
 * @description
 * Converts the given ChangeData array to two strings representing the old source and new source of a change block.
 * The format of the strings is as follows:
 */
export function markEdits(hunks: HunkData[], diffMethod: DiffMethod): TokenizeEnhancer {
  /* 
    changeBlocks is an array that contains information about the lines that have changes (additions or deletions).
    Unchanged lines are not included.
  */
  const changeBlocks = flatMap(
    hunks.map((hunk) => hunk.changes),
    findChangeBlocks
  );

  const [oldEdits, newEdits] = changeBlocks
    /*
      diffChangeBlock diffs two substrings and determines character positions of changes,
      taking the diffing algorithm into account (by char, by word, by sentence, etc.)
    */
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
