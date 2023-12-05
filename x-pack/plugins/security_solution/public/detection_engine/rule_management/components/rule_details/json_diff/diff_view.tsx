/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css, Global } from '@emotion/react';
import {
  Diff,
  useSourceExpansion,
  useMinCollapsedLines,
  parseDiff,
  tokenize,
} from 'react-diff-view';
import 'react-diff-view/style/index.css';
import type { RenderGutter, HunkData, TokenizeOptions, DiffProps } from 'react-diff-view';
import unidiff from 'unidiff';
import { useEuiTheme } from '@elastic/eui';
import { Hunks } from './hunks';
import { markEdits, DiffMethod } from './mark_edits';

const useExpand = (hunks: HunkData[], oldSource: string, newSource: string) => {
  const [hunksWithSourceExpanded, expandRange] = useSourceExpansion(hunks, oldSource);
  const hunksWithMinLinesCollapsed = useMinCollapsedLines(0, hunksWithSourceExpanded, oldSource);

  return {
    expandRange,
    hunks: hunksWithMinLinesCollapsed,
  };
};

const useTokens = (hunks: HunkData[], diffMethod: DiffMethod, oldSource: string) => {
  if (!hunks) {
    return undefined;
  }

  const options: TokenizeOptions = {
    oldSource,
    highlight: false,
    enhancers: [
      /*
        "markEditsBy" is a slightly modified version of "markEdits" enhancer from react-diff-view
        to enable word-level highlighting.
      */
      markEdits(hunks, diffMethod),
    ],
  };

  try {
    /*
      Synchroniously applies all the enhancers to the hunks and returns an array of tokens.
      There's also a way to use a web worker to tokenize in a separate thread.
      Example can be found here: https://github.com/otakustay/react-diff-view/blob/49cebd0958ef323c830395c1a1da601560a71781/site/components/DiffView/index.tsx#L43
      It didn't work for me right away, but theoretically the possibility is there.
    */
    return tokenize(hunks, options);
  } catch (ex) {
    return undefined;
  }
};

const renderGutter: RenderGutter = ({ change }) => {
  /*
    Custom gutter (a column where you normally see line numbers).
    Here's I am returning "+" or "-" so the diff is more readable by colorblind people.
  */
  if (change.type === 'insert') {
    return <span>{'+'}</span>;
  }

  if (change.type === 'delete') {
    return <span>{'-'}</span>;
  }

  return null;
};

const convertToDiffFile = (oldSource: string, newSource: string) => {
  /*
    "diffLines" call below converts two strings of text into an array of Change objects.
    Change objects look like this:
    [
      ...
      {
        "count": 2,
        "removed": true,
        "value": "\"from\": \"now-540s\""
      },
      {
        "count": 1,
        "added": true,
        "value": "\"from\": \"now-9m\""
      },
      ...
    ]

    "formatLines" takes an array of Change objects and turns it into one big "unified Git diff" string.
    Unified Git diff is a string with Git markers added. Looks something like this:
    `
      @@ -3,16 +3,15 @@
         "author": ["Elastic"],
      -  "from": "now-540s",
      +  "from": "now-9m",
         "history_window_start": "now-14d",
    `
  */

  const unifiedDiff: string = unidiff.formatLines(unidiff.diffLines(oldSource, newSource), {
    context: 3,
  });

  /*
    "parseDiff" converts a unified diff string into a gitdiff-parser File object.

    File object contains some metadata and the "hunks" property - an array of Hunk objects.
    Hunks represent changed lines of code plus a few unchanged lines above and below for context.
  */
  const [diffFile] = parseDiff(unifiedDiff, {
    nearbySequences: 'zip',
  });

  return diffFile;
};

const TABLE_CLASS_NAME = 'rule-update-diff-table';
const CODE_CLASS_NAME = 'rule-update-diff-code';
const GUTTER_CLASS_NAME = 'rule-update-diff-gutter';

const CustomStyles: React.FC = ({ children }) => {
  const { euiTheme } = useEuiTheme();

  const customCss = css`
    .${TABLE_CLASS_NAME} .diff-gutter-col {
      width: ${euiTheme.size.xl};
    }

    .${CODE_CLASS_NAME}.diff-code, .${GUTTER_CLASS_NAME}.diff-gutter {
      background: transparent;
    }

    .${GUTTER_CLASS_NAME}:nth-child(3) {
      border-left: 1px solid ${euiTheme.colors.mediumShade};
    }

    .${GUTTER_CLASS_NAME}.diff-gutter-delete {
      color: ${euiTheme.colors.dangerText};
      font-weight: bold;
    }

    .${GUTTER_CLASS_NAME}.diff-gutter-insert {
      color: ${euiTheme.colors.successText};
      font-weight: bold;
    }

    .${CODE_CLASS_NAME}.diff-code {
      padding: 0 ${euiTheme.size.l} 0 ${euiTheme.size.m};
    }

    .${CODE_CLASS_NAME}.diff-code-delete .diff-code-edit,
    .${CODE_CLASS_NAME}.diff-code-insert .diff-code-edit {
      background: transparent;
    }

    .${CODE_CLASS_NAME}.diff-code-delete .diff-code-edit {
      color: ${euiTheme.colors.dangerText};
      text-decoration: line-through;
    }

    .${CODE_CLASS_NAME}.diff-code-insert .diff-code-edit {
      color: ${euiTheme.colors.successText};
      text-decoration: underline;
    }
  `;

  return (
    <>
      <Global styles={customCss} />
      {children}
    </>
  );
};

interface DiffViewProps extends Partial<DiffProps> {
  oldSource: string;
  newSource: string;
  diffMethod?: DiffMethod;
}

export const DiffView = ({
  oldSource,
  newSource,
  diffMethod = DiffMethod.WORDS,
}: DiffViewProps) => {
  /*
    "react-diff-view" components consume diffs not as a strings, but as something they call "hunks".
    So we first need to convert our "before" and "after" strings into these "hunks".
    "hunks" are objects describing changed sections of code plus a few unchanged lines above and below for context.
  */

  /*
    "diffFile" is essentially an object containing "hunks" and some metadata.
  */
  const diffFile = useMemo(() => convertToDiffFile(oldSource, newSource), [oldSource, newSource]);

  /*
    Sections of diff without changes are hidden by default, because they are not present in the "hunks" array.

    "useExpand" allows to show these hidden sections when user clicks on "Expand hidden <number> lines" button.

    "expandRange" basically merges two hunks into one: takes first hunk, appends all the lines between it and the second hunk and finally appends the second hunk.

    returned "hunks" is the resulting array of hunks with hidden section expanded.
  */
  const { expandRange, hunks } = useExpand(diffFile.hunks, oldSource, newSource);

  /*
    Here we go over each hunk and extract tokens from it. For example, splitting strings into words,
    so we can later highlight changes on a word-by-word basis vs line-by-line.
  */
  const tokens = useTokens(hunks, diffMethod, oldSource);

  return (
    <CustomStyles>
      <Diff
        /*
        "diffType": can be 'add', 'delete', 'modify', 'rename' or 'copy'
        passing 'add' or 'delete' would skip rendering one of the sides in split view.
        As I understand we'll never end up with anything other than 'modify' here,
        because we always have two strings to compare.
      */
        diffType={diffFile.type}
        hunks={hunks}
        renderGutter={renderGutter}
        tokens={tokens}
        className={TABLE_CLASS_NAME}
        gutterClassName={GUTTER_CLASS_NAME}
        codeClassName={CODE_CLASS_NAME}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-shadow */}
        {(hunks) => <Hunks hunks={hunks} oldSource={oldSource} expandRange={expandRange} />}
      </Diff>
    </CustomStyles>
  );
};
