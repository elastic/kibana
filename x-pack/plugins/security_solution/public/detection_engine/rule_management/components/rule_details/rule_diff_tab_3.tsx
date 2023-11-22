/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import { uniqueId } from 'lodash';
import {
  Diff,
  Hunk,
  useSourceExpansion,
  useMinCollapsedLines,
  HunkData,
  MarkEditsType,
  DiffType,
  GutterOptions,
  Decoration,
  DecorationProps,
  getCollapsedLinesCountBetween,
  parseDiff,
  tokenize,
  markEdits,
  markWord,
} from 'react-diff-view';
import { formatLines, diffLines } from 'unidiff';
import { Global, css } from '@emotion/react';
// import 'react-diff-view/styles/index.css';
import {
  EuiSpacer,
  EuiAccordion,
  EuiTitle,
  EuiFlexGroup,
  EuiHorizontalRule,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { RuleFieldsDiff } from '../../../../../common/api/detection_engine/prebuilt_rules/model/diff/rule_diff/rule_diff';

import * as i18n from './translations';

const HIDDEN_FIELDS = ['meta', 'rule_schedule', 'version'];

const FIELD_CONFIG_BY_NAME = {
  eql_query: {
    label: 'EQL query',
    compareMethod: 'diffWordsWithSpace',
  },
  name: {
    label: 'Name',
    compareMethod: 'diffWordsWithSpace',
  },
  note: {
    label: 'Investigation guide',
    compareMethod: 'diffWordsWithSpace',
  },
  references: {
    label: i18n.REFERENCES_FIELD_LABEL,
    compareMethod: 'diffJson',
  },
  risk_score: {
    // JSON.stringify(fields.risk_score.current_version)
    label: i18n.RISK_SCORE_FIELD_LABEL,
    compareMethod: 'diffJson',
  },
  threat: {
    label: 'THREAT',
    compareMethod: 'diffJson',
  },
  severity: {
    label: 'Severity_',
    compareMethod: 'diffWords',
  },
};

const tokenizeFn = (hunks) => {
  console.log('hunks', hunks);
  if (!hunks) {
    return undefined;
  }

  const options = {
    highlight: false,
    enhancers: [markEdits(hunks, { type: 'block' }), markWord('description', 'description_id')],
  };

  try {
    return tokenize(hunks, options);
  } catch (ex) {
    return undefined;
  }
};

function fakeIndex() {
  return uniqueId().slice(0, 9);
}

function appendGitDiffHeaderIfNeeded(diffText: string) {
  console.log('appendGitDiffHeaderIfNeeded INPUT', diffText);
  if (diffText.startsWith('diff --git')) {
    return diffText;
  }

  const segments = ['diff --git a/a b/b', `index ${fakeIndex()}..${fakeIndex()} 100644`, diffText];
  return segments.join('\n');
}

interface HunkInfoProps extends Omit<DecorationProps, 'children'> {
  hunk: HunkData;
}

function HunkInfo({ hunk, ...props }: HunkInfoProps) {
  return (
    <Decoration {...props}>
      {null}
      {hunk.content}
    </Decoration>
  );
}

interface UnfoldProps extends Omit<DecorationProps, 'children'> {
  start: number;
  end: number;
  direction: 'up' | 'down' | 'none';
  onExpand: (start: number, end: number) => void;
}

function Unfold({ start, end, direction, onExpand, ...props }: UnfoldProps) {
  const expand = useCallback(() => onExpand(start, end), [onExpand, start, end]);

  const lines = end - start;

  return (
    <Decoration {...props}>
      <div onClick={expand}>&nbsp;Expand hidden {lines} lines</div>
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
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    const nextStart = previousHunk.oldStart + previousHunk.oldLines;
    const collapsedLines = linesCount - nextStart + 1;

    if (collapsedLines <= 0) {
      return null;
    }

    return (
      <>
        {collapsedLines > 10 && (
          <Unfold
            direction="down"
            start={nextStart}
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            end={nextStart + 10}
            onExpand={onExpand}
          />
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

  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  const collapsedStart = previousHunk.oldStart + previousHunk.oldLines;
  const collapsedEnd = currentHunk.oldStart;

  if (collapsedLines < 10) {
    return (
      <Unfold direction="none" start={collapsedStart} end={collapsedEnd} onExpand={onExpand} />
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/restrict-plus-operands */}
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

interface EnhanceOptions {
  language: string;
  editsType: MarkEditsType;
}

function useEnhance(
  hunks: HunkData[],
  oldSource: string | null,
  { language, editsType }: EnhanceOptions
) {
  const [hunksWithSourceExpanded, expandRange] = useSourceExpansion(hunks, oldSource); // Operates on hunks to allow "expansion" behaviour - substitutes two hunks with one hunk including data from two hunks and everything in between
  const hunksWithMinLinesCollapsed = useMinCollapsedLines(0, hunksWithSourceExpanded, oldSource);

  return {
    expandRange,
    hunks: hunksWithMinLinesCollapsed,
  };
}

const renderToken = (token, defaultRender, i) => {
  switch (token.type) {
    case 'space':
      console.log(token);
      return (
        <span key={i} className="space">
          {token.children && token.children.map((token, i) => renderToken(token, defaultRender, i))}
        </span>
      );
    default:
      return defaultRender(token, i);
  }
};

interface Props {
  oldSource: string | null;
  type: DiffType;
  hunks: HunkData[];
}

function DiffView(props: Props) {
  const { oldSource, type } = props;
  const configuration = {
    viewType: 'split',
    editsType: 'block',
    showGutter: true,
    language: 'text',
  } as const;

  const { expandRange, hunks } = useEnhance(props.hunks, oldSource, configuration);

  const { viewType, showGutter } = configuration;
  const renderGutter = useCallback(
    ({ change, side, inHoverState, renderDefault, wrapInAnchor }: GutterOptions) => {
      return wrapInAnchor(renderDefault());
    },
    []
  );

  const linesCount = oldSource ? oldSource.split('\n').length : 0;
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const renderHunk = (children: ReactElement[], hunk: HunkData, i: number, hunks: HunkData[]) => {
    const previousElement = children[children.length - 1];
    const decorationElement = oldSource ? (
      <UnfoldCollapsed
        key={`decoration-${hunk.content}`}
        previousHunk={previousElement && previousElement.props.hunk}
        currentHunk={hunk}
        linesCount={linesCount}
        onExpand={expandRange}
      />
    ) : (
      <HunkInfo key={`decoration-${hunk.content}`} hunk={hunk} />
    );
    children.push(decorationElement);

    const hunkElement = <Hunk key={`hunk-${hunk.content}`} hunk={hunk} />;
    children.push(hunkElement);

    if (i === hunks.length - 1 && oldSource) {
      const unfoldTailElement = (
        <UnfoldCollapsed
          key="decoration-tail"
          previousHunk={hunk}
          linesCount={linesCount}
          onExpand={expandRange}
        />
      );
      children.push(unfoldTailElement);
    }

    return children;
  };

  return (
    <Diff
      viewType={viewType}
      diffType={type}
      hunks={hunks}
      gutterType={showGutter ? 'default' : 'none'}
      renderGutter={renderGutter}
      tokens={props.tokens}
      renderToken={renderToken}
    >
      {(hunks) => hunks.reduce(renderHunk, [])}
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
        const oldSource = JSON.stringify(fields[fieldName]?.current_version, null, 2);
        const newSource = JSON.stringify(fields[fieldName]?.merged_version, null, 2);

        const diff = formatLines(diffLines(oldSource, newSource), { context: 3 });

        const [file] = parseDiff(appendGitDiffHeaderIfNeeded(diff), {
          nearbySequences: 'zip',
        });

        return (
          <>
            <ExpandableSection
              title={FIELD_CONFIG_BY_NAME[fieldName]?.label ?? fieldName.toUpperCase()}
              isOpen={openSections[fieldName]}
              toggle={() => {
                toggleSection(fieldName);
              }}
            >
              <DiffView type={file.type} hunks={file.hunks} oldSource={oldSource} />
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

const WholeObjectDiff = ({ currentRule, mergedRule, openSections, toggleSection }) => {
  const oldSource = JSON.stringify(currentRule, Object.keys(currentRule).sort(), 2);
  const newSource = JSON.stringify(mergedRule, Object.keys(mergedRule).sort(), 2);

  const diff = formatLines(diffLines(oldSource, newSource), { context: 3 });

  const [file] = parseDiff(appendGitDiffHeaderIfNeeded(diff), {
    nearbySequences: 'zip',
  });

  const tokens = useMemo(() => tokenizeFn(file.hunks), [file.hunks]);

  return (
    <>
      <ExpandableSection
        title={'Whole object diff'}
        isOpen={openSections.whole}
        toggle={() => {
          toggleSection('whole');
        }}
      >
        <DiffView type={file.type} hunks={file.hunks} oldSource={oldSource} tokens={tokens} />
      </ExpandableSection>
      <EuiHorizontalRule margin="m" />
    </>
  );
};

interface RuleDiffTabProps {
  fields: Partial<RuleFieldsDiff>;
}

export const RuleDiffTab = ({ fields, currentRule, mergedRule }: RuleDiffTabProps) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.keys(fields).reduce((sections, fieldName) => ({ ...sections, [fieldName]: true }), {})
  );

  const toggleSection = (sectionName: string) => {
    setOpenSections((prevOpenSections) => ({
      ...prevOpenSections,
      [sectionName]: !prevOpenSections[sectionName],
    }));
  };

  /*
  export declare enum DiffMethod {
    CHARS = "diffChars",
    WORDS = "diffWords",
    WORDS_WITH_SPACE = "diffWordsWithSpace",
    LINES = "diffLines",
    TRIMMED_LINES = "diffTrimmedLines",
    SENTENCES = "diffSentences",
    CSS = "diffCss",
    JSON = "diffJson"
}
  */

  return (
    <>
      <EuiSpacer size="m" />
      <WholeObjectDiff
        currentRule={currentRule}
        mergedRule={mergedRule}
        openSections={openSections}
        toggleSection={toggleSection}
      />
      <Fields fields={fields} openSections={openSections} toggleSection={toggleSection} />
      <Global
        styles={css`
          :root {
            --diff-background-color: initial;
            --diff-text-color: initial;
            --diff-font-family: Consolas, Courier, monospace;
            --diff-selection-background-color: #b3d7ff;
            --diff-selection-text-color: var(--diff-text-color);
            --diff-gutter-insert-background-color: #d6fedb;
            --diff-gutter-insert-text-color: var(--diff-text-color);
            --diff-gutter-delete-background-color: #fadde0;
            --diff-gutter-delete-text-color: var(--diff-text-color);
            --diff-gutter-selected-background-color: #fffce0;
            --diff-gutter-selected-text-color: var(--diff-text-color);
            --diff-code-insert-background-color: #eaffee;
            --diff-code-insert-text-color: var(--diff-text-color);
            --diff-code-delete-background-color: #fdeff0;
            --diff-code-delete-text-color: var(--diff-text-color);
            --diff-code-insert-edit-background-color: #c0dc91;
            --diff-code-insert-edit-text-color: var(--diff-text-color);
            --diff-code-delete-edit-background-color: #f39ea2;
            --diff-code-delete-edit-text-color: var(--diff-text-color);
            --diff-code-selected-background-color: #fffce0;
            --diff-code-selected-text-color: var(--diff-text-color);
            --diff-omit-gutter-line-color: #cb2a1d;
          }

          .diff {
            background-color: var(--diff-background-color);
            color: var(--diff-text-color);
            table-layout: fixed;
            border-collapse: collapse;
            width: 100%;
          }

          .diff::selection {
            background-color: var(--diff-selection-background-color);
            color: var(--diff-selection-text-color);
          }

          .diff td {
            vertical-align: top;
            padding-top: 0;
            padding-bottom: 0;
          }

          .diff-line {
            line-height: 1.5;
            font-family: var(--diff-font-family);
          }

          .diff-gutter > a {
            color: inherit;
            display: block;
          }

          .diff-gutter {
            padding: 0 1ch;
            text-align: right;
            cursor: pointer;
            user-select: none;
          }

          .diff-gutter-insert {
            background-color: var(--diff-gutter-insert-background-color);
            color: var(--diff-gutter-insert-text-color);
          }

          .diff-gutter-delete {
            background-color: var(--diff-gutter-delete-background-color);
            color: var(--diff-gutter-delete-text-color);
          }

          .diff-gutter-omit {
            cursor: default;
          }

          .diff-gutter-selected {
            background-color: var(--diff-gutter-selected-background-color);
            color: var(--diff-gutter-selected-text-color);
          }

          .diff-code {
            white-space: pre-wrap;
            word-wrap: break-word;
            word-break: break-all;
            padding: 0 0 0 0.5em;
          }

          .diff-code-edit {
            color: inherit;
          }

          .diff-code-insert {
            background-color: var(--diff-code-insert-background-color);
            color: var(--diff-code-insert-text-color);
          }

          .diff-code-insert .diff-code-edit {
            background-color: var(--diff-code-insert-edit-background-color);
            color: var(--diff-code-insert-edit-text-color);
          }

          .diff-code-delete {
            background-color: var(--diff-code-delete-background-color);
            color: var(--diff-code-delete-text-color);
          }

          .diff-code-delete .diff-code-edit {
            background-color: var(--diff-code-delete-edit-background-color);
            color: var(--diff-code-delete-edit-text-color);
          }

          .diff-code-selected {
            background-color: var(--diff-code-selected-background-color);
            color: var(--diff-code-selected-text-color);
          }

          .diff-widget-content {
            vertical-align: top;
          }

          .diff-gutter-col {
            width: 7ch;
          }

          .diff-gutter-omit {
            height: 0;
          }

          .diff-gutter-omit:before {
            content: ' ';
            display: block;
            white-space: pre;
            width: 2px;
            height: 100%;
            margin-left: 4.6ch;
            overflow: hidden;
            background-color: var(--diff-omit-gutter-line-color);
          }

          .diff-decoration {
            line-height: 1.5;
            user-select: none;
          }

          .diff-decoration-content {
            font-family: var(--diff-font-family);
            padding: 0;
          }
        `}
      />
    </>
  );
};
