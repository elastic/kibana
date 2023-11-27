/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useContext, useCallback } from 'react';
import type { ReactElement } from 'react';
import { css, Global } from '@emotion/react';
import {
  Diff,
  Hunk,
  useSourceExpansion,
  useMinCollapsedLines,
  Decoration,
  getCollapsedLinesCountBetween,
  parseDiff,
  tokenize,
  markEdits,
} from 'react-diff-view';
import 'react-diff-view/style/index.css';
import type { RenderGutter, HunkData, DecorationProps, TokenizeOptions } from 'react-diff-view';
import unidiff from 'unidiff';
import { get } from 'lodash';
import {
  EuiSpacer,
  EuiAccordion,
  EuiIcon,
  EuiLink,
  EuiTitle,
  EuiFlexGroup,
  EuiHorizontalRule,
  useGeneratedHtmlId,
  useEuiTheme,
  EuiSwitch,
  EuiRadioGroup,
} from '@elastic/eui';
import type { RuleFieldsDiff } from '../../../../../common/api/detection_engine/prebuilt_rules/model/diff/rule_diff/rule_diff';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';
import { markEditsBy, DiffMethod } from './mark_edits_by_word';

const HIDDEN_FIELDS = ['meta', 'rule_schedule', 'version'];

const CompareMethodContext = React.createContext(DiffMethod.CHARS);

interface UnfoldProps extends Omit<DecorationProps, 'children'> {
  start: number;
  end: number;
  direction: 'up' | 'down' | 'none';
  onExpand: (start: number, end: number) => void;
}

function Unfold({ start, end, direction, onExpand, ...props }: UnfoldProps) {
  const expand = useCallback(() => onExpand(start, end), [onExpand, start, end]);

  const linesCount = end - start;

  const iconType = {
    up: 'sortUp',
    down: 'sortDown',
    none: 'sortable',
  };

  return (
    <Decoration {...props}>
      <EuiLink onClick={expand}>
        <EuiIcon type={iconType[direction]} />
        <span>{`Expand ${linesCount}${direction !== 'none' ? ' more' : ''} hidden line${
          linesCount > 1 ? 's' : ''
        }`}</span>
      </EuiLink>
    </Decoration>
  );
}

interface UnfoldCollapsedProps {
  previousHunk: HunkData;
  currentHunk?: HunkData;
  linesCount: number;
  onExpand: (start: number, end: number) => void;
}

function UnfoldCollapsed({
  previousHunk,
  currentHunk,
  linesCount,
  onExpand,
}: UnfoldCollapsedProps) {
  if (!currentHunk) {
    const nextStart = previousHunk.oldStart + previousHunk.oldLines;
    const collapsedLines = linesCount - nextStart + 1;

    if (collapsedLines <= 0) {
      return null;
    }

    return (
      <>
        {collapsedLines > 10 && (
          <Unfold direction="down" start={nextStart} end={nextStart + 10} onExpand={onExpand} />
        )}
        <Unfold direction="none" start={nextStart} end={linesCount + 1} onExpand={onExpand} />
      </>
    );
  }

  const collapsedLines = getCollapsedLinesCountBetween(previousHunk, currentHunk);

  if (!previousHunk) {
    if (!collapsedLines) {
      return null;
    }

    const start = Math.max(currentHunk.oldStart - 10, 1);

    return (
      <>
        <Unfold direction="none" start={1} end={currentHunk.oldStart} onExpand={onExpand} />
        {collapsedLines > 10 && (
          <Unfold direction="up" start={start} end={currentHunk.oldStart} onExpand={onExpand} />
        )}
      </>
    );
  }

  const collapsedStart = previousHunk.oldStart + previousHunk.oldLines;
  const collapsedEnd = currentHunk.oldStart;

  if (collapsedLines < 10) {
    return (
      <Unfold direction="none" start={collapsedStart} end={collapsedEnd} onExpand={onExpand} />
    );
  }

  return (
    <>
      <Unfold
        direction="down"
        start={collapsedStart}
        end={collapsedStart + 10}
        onExpand={onExpand}
      />
      <Unfold direction="none" start={collapsedStart} end={collapsedEnd} onExpand={onExpand} />
      <Unfold direction="up" start={collapsedEnd - 10} end={collapsedEnd} onExpand={onExpand} />
    </>
  );
}

const useExpand = (hunks: HunkData[], oldSource: string, newSource: string) => {
  // useMemo(() => {}, [oldSource, newSource]);
  const [hunksWithSourceExpanded, expandRange] = useSourceExpansion(hunks, oldSource); // Operates on hunks to allow "expansion" behaviour - substitutes two hunks with one hunk including data from two hunks and everything in between
  const hunksWithMinLinesCollapsed = useMinCollapsedLines(0, hunksWithSourceExpanded, oldSource);

  return {
    expandRange,
    hunks: hunksWithMinLinesCollapsed,
  };
};

const useTokens = (hunks: HunkData[], compareMethod: DiffMethod, oldSource: string) => {
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
      compareMethod === DiffMethod.CHARS
        ? markEdits(hunks, { type: 'block' }) // Using built-in "markEdits" enhancer for char-level diffing
        : markEditsBy(hunks, compareMethod), // Using custom "markEditsBy" enhancer for other-level diffing
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
      "parseDiff" converts a unified diff string into a JSDiff File object.
    */
  const [diffFile] = parseDiff(unifiedDiff, {
    nearbySequences: 'zip',
  });
  /*
      File object contains some metadata and the "hunks" property - an array of Hunk objects.
      At this stage Hunks represent changed lines of code plus a few unchanged lines above and below for context.
      Hunk objects look like this:
      [
        ...
        {
          content: '  "from": "now-9m",'
          isInsert: true,
          lineNumber: 14,
          type: "insert"
        },
        {
          content: '  "from": "now-540s",'
          isDelete: true,
          lineNumber: 15,
          type: "delete"
        },
        ...
      ]
    */

  return diffFile;
};

interface DiffViewProps {
  oldSource: string;
  newSource: string;
}

interface HunksProps {
  hunks: HunkData[];
  oldSource: string;
  expandRange: (start: number, end: number) => void;
}

const Hunks = ({ hunks, oldSource, expandRange }: HunksProps) => {
  const linesCount = oldSource.split('\n').length;

  const hunkElements = hunks.reduce((children: ReactElement[], hunk: HunkData, index: number) => {
    const previousElement = children[children.length - 1];

    children.push(
      <UnfoldCollapsed
        key={`decoration-${hunk.content}`}
        previousHunk={previousElement && previousElement.props.hunk}
        currentHunk={hunk}
        linesCount={linesCount}
        onExpand={expandRange}
      />
    );

    children.push(<Hunk key={`hunk-${hunk.content}`} hunk={hunk} />);

    const isLastHunk = index === hunks.length - 1;
    if (isLastHunk && oldSource) {
      children.push(
        <UnfoldCollapsed
          key="decoration-tail"
          previousHunk={hunk}
          linesCount={linesCount}
          onExpand={expandRange}
        />
      );
    }

    return children;
  }, []);

  return <>{hunkElements}</>;
};

const CODE_CLASS_NAME = 'rule-update-diff-code';
const GUTTER_CLASS_NAME = 'rule-update-diff-gutter';

interface CustomStylesProps {
  children: React.ReactNode;
}

const CustomStyles = ({ children }: CustomStylesProps) => {
  const { euiTheme } = useEuiTheme();
  const [enabled, setEnabled] = useState(false);

  const customCss = css`
    .${CODE_CLASS_NAME}.diff-code, .${GUTTER_CLASS_NAME}.diff-gutter {
      background: transparent;
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
    }
  `;

  return (
    <>
      {enabled && <Global styles={customCss} />}
      <EuiSwitch
        label="Styles as in mockup"
        checked={enabled}
        onChange={() => {
          setEnabled(!enabled);
        }}
      />
      <EuiSpacer size="m" />
      {children}
    </>
  );
};

function DiffView({ oldSource, newSource }: DiffViewProps) {
  const compareMethod = useContext(CompareMethodContext);

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
  const tokens = useTokens(hunks, compareMethod, oldSource);

  return (
    <Diff
      viewType={'split'} // Can be 'unified' or 'split'
      /* 
        "diffType": can be 'add', 'delete', 'modify', 'rename' or 'copy'
        passing 'add' or 'delete' would skip rendering one of the sides in split view.
        As I understand we'll never end up with anything other than 'modify' here, 
        because we always have two string to compare.
      */
      diffType={diffFile.type}
      hunks={hunks}
      renderGutter={renderGutter}
      tokens={tokens}
      gutterClassName={GUTTER_CLASS_NAME}
      codeClassName={CODE_CLASS_NAME}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-shadow */}
      {(hunks) => <Hunks hunks={hunks} oldSource={oldSource} expandRange={expandRange} />}
    </Diff>
  );
}

interface FieldsProps {
  fields: Partial<RuleFieldsDiff>;
  openSections: Record<string, boolean>;
  toggleSection: (sectionName: string) => void;
}

const Fields = ({ fields, openSections, toggleSection }: FieldsProps) => {
  const visibleFields = Object.keys(fields).filter(
    (fieldName) => !HIDDEN_FIELDS.includes(fieldName)
  );

  return (
    <>
      {visibleFields.map((fieldName) => {
        const currentVersion: string = get(fields, [fieldName, 'current_version'], '');
        const mergedVersion: string = get(fields, [fieldName, 'merged_version'], '');

        const oldSource = JSON.stringify(currentVersion, null, 2);
        const newSource = JSON.stringify(mergedVersion, null, 2);

        return (
          <>
            <ExpandableSection
              title={fieldName}
              isOpen={openSections[fieldName]}
              toggle={() => {
                toggleSection(fieldName);
              }}
            >
              <DiffView oldSource={oldSource} newSource={newSource} />
            </ExpandableSection>
            <EuiHorizontalRule margin="m" />
          </>
        );
      })}
    </>
  );
};

interface ExpandableSectionProps {
  title: string;
  isOpen: boolean;
  toggle: () => void;
  children: React.ReactNode;
}

const ExpandableSection = ({ title, isOpen, toggle, children }: ExpandableSectionProps) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'accordion' });

  return (
    <EuiAccordion
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={toggle}
      paddingSize="none"
      id={accordionId}
      buttonContent={
        <EuiTitle size="s">
          <h3>{title}</h3>
        </EuiTitle>
      }
      initialIsOpen={true}
    >
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="none" direction="column">
        {children}
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

const renderGutter: RenderGutter = ({ change }) => {
  /* 
    Custom gutter (a column where you normally see line numbers).
    Here's I am returning "+" or "-" so the diff is more readable by colorblind people.
  */
  if (change.type === 'insert') {
    return '+';
  }

  if (change.type === 'delete') {
    return '-';
  }

  if (change.type === 'normal') {
    return null;
  }
};

const sortAndStringifyJson = (jsObject: Record<string, unknown>): string =>
  JSON.stringify(jsObject, Object.keys(jsObject).sort(), 2);

interface WholeObjectDiffProps {
  oldRule: RuleResponse;
  newRule: RuleResponse;
  openSections: Record<string, boolean>;
  toggleSection: (sectionName: string) => void;
}

const WholeObjectDiff = ({
  oldRule,
  newRule,
  openSections,
  toggleSection,
}: WholeObjectDiffProps) => {
  const oldSource = sortAndStringifyJson(oldRule);
  const newSource = sortAndStringifyJson(newRule);

  return (
    <>
      <ExpandableSection
        title={'Whole object diff'}
        isOpen={openSections.whole}
        toggle={() => {
          toggleSection('whole');
        }}
      >
        <DiffView oldSource={oldSource} newSource={newSource} />
      </ExpandableSection>
      <EuiHorizontalRule margin="m" />
    </>
  );
};

interface RuleDiffTabProps {
  oldRule: RuleResponse;
  newRule: RuleResponse;
  fields: Partial<RuleFieldsDiff>;
}

export const RuleDiffTabReactDiffView = ({ fields, oldRule, newRule }: RuleDiffTabProps) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.keys(fields).reduce((sections, fieldName) => ({ ...sections, [fieldName]: true }), {})
  );

  const toggleSection = (sectionName: string) => {
    setOpenSections((prevOpenSections) => ({
      ...prevOpenSections,
      [sectionName]: !prevOpenSections[sectionName],
    }));
  };

  const options = [
    {
      id: DiffMethod.CHARS,
      label: 'Chars',
    },
    {
      id: DiffMethod.WORDS,
      label: 'Words',
    },
    {
      id: DiffMethod.WORDS_CUSTOM_USING_DMP,
      label: 'Words, alternative method (using "diff-match-patch" library)',
    },
    {
      id: DiffMethod.LINES,
      label: 'Lines',
    },
    {
      id: DiffMethod.SENTENCES,
      label: 'Sentences',
    },
  ];

  const [compareMethod, setCompareMethod] = useState<DiffMethod>(DiffMethod.CHARS);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiRadioGroup
        options={options}
        idSelected={compareMethod}
        onChange={(optionId) => {
          setCompareMethod(optionId as DiffMethod);
        }}
        legend={{
          children: <span>{'Diffing algorthm'}</span>,
        }}
      />
      <EuiSpacer size="m" />
      <CustomStyles>
        <CompareMethodContext.Provider value={compareMethod}>
          <WholeObjectDiff
            oldRule={oldRule}
            newRule={newRule}
            openSections={openSections}
            toggleSection={toggleSection}
          />
          <Fields fields={fields} openSections={openSections} toggleSection={toggleSection} />
        </CompareMethodContext.Provider>
      </CustomStyles>
    </>
  );
};
