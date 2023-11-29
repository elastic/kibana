/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useContext, useMemo } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { EuiSpacer, EuiSwitch, EuiRadioGroup, useEuiTheme } from '@elastic/eui';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';
import { sortAndStringifyJson } from './json_diff/sort_stringify_json';

const CustomStylesContext = React.createContext({});
const DiffMethodContext = React.createContext(DiffMethod.CHARS);

interface CustomStylesProps {
  children: React.ReactNode;
}

const CustomStyles = ({ children }: CustomStylesProps) => {
  const { euiTheme } = useEuiTheme();
  const [enabled, setEnabled] = useState(false);

  const customStyles = {
    variables: {
      light: {
        addedBackground: 'transparent',
        removedBackground: 'transparent',
      },
    },
    wordAdded: {
      background: 'transparent',
      color: euiTheme.colors.successText,
    },
    wordRemoved: {
      background: 'transparent',
      color: euiTheme.colors.dangerText,
      textDecoration: 'line-through',
    },
  };

  return (
    <CustomStylesContext.Provider value={enabled && customStyles}>
      <EuiSwitch
        label="Styles as in mockup"
        checked={enabled}
        onChange={() => {
          setEnabled(!enabled);
        }}
      />
      <EuiSpacer size="m" />
      {children}
    </CustomStylesContext.Provider>
  );
};

interface WholeObjectDiffProps {
  oldRule: RuleResponse;
  newRule: RuleResponse;
}

const WholeObjectDiff = ({ oldRule, newRule }: WholeObjectDiffProps) => {
  const diffMethod = useContext(DiffMethodContext);
  const styles = useContext(CustomStylesContext);

  const [oldSource, newSource] = useMemo(() => {
    const oldSrc =
      diffMethod === DiffMethod.JSON && typeof oldRule === 'object'
        ? oldRule
        : sortAndStringifyJson(oldRule);

    const newSrc =
      diffMethod === DiffMethod.JSON && typeof newRule === 'object'
        ? newRule
        : sortAndStringifyJson(newRule);

    return [oldSrc, newSrc];
  }, [oldRule, newRule, diffMethod]);

  return (
    <ReactDiffViewer
      /*
        Passing text for diffing is really easy: just pass two strings.
        Compare this to "react-diff-view" where you have to first run your
        strings through a bunch of transformations to extract hunks and tokens.
      */
      oldValue={oldSource}
      newValue={newSource}
      splitView={true}
      hideLineNumbers={true}
      /*
        Specifying the diffing algorithm is also convenient.

        Possbile values for "compareMethod":
        diffChars, diffWords, diffWordsWithSpace,
        diffLines, diffTrimmedLines, diffSentences,
        diffCss, diffJson.

        Much easier compared to DIY approach with "react-diff-view".
      */
      compareMethod={diffMethod}
      styles={styles}
    />
  );
};

interface RuleDiffTabProps {
  oldRule: RuleResponse;
  newRule: RuleResponse;
}

export const RuleDiffTabReactDiffViewerContinued = ({ oldRule, newRule }: RuleDiffTabProps) => {
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
      id: DiffMethod.LINES,
      label: 'Lines',
    },
    {
      id: DiffMethod.SENTENCES,
      label: 'Sentences',
    },
    {
      id: DiffMethod.JSON,
      label: 'JSON',
    },
  ];

  const [compareMethod, setCompareMethod] = useState<DiffMethod>(DiffMethod.JSON);

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
      <DiffMethodContext.Provider value={compareMethod}>
        <CustomStyles>
          <WholeObjectDiff oldRule={oldRule} newRule={newRule} />
        </CustomStyles>
      </DiffMethodContext.Provider>
    </>
  );
};
