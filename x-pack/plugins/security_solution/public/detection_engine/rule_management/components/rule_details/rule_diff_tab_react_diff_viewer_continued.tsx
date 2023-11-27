/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useContext } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { get } from 'lodash';
import {
  EuiSpacer,
  EuiAccordion,
  EuiTitle,
  EuiFlexGroup,
  EuiSwitch,
  EuiHorizontalRule,
  EuiRadioGroup,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import type { RuleFieldsDiff } from '../../../../../common/api/detection_engine/prebuilt_rules/model/diff/rule_diff/rule_diff';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';

const HIDDEN_FIELDS = ['meta', 'rule_schedule', 'version'];

const CustomStylesContext = React.createContext({});
const CompareMethodContext = React.createContext(DiffMethod.CHARS);

interface FieldsProps {
  fields: Partial<RuleFieldsDiff>;
  openSections: Record<string, boolean>;
  toggleSection: (sectionName: string) => void;
}

const Fields = ({ fields, openSections, toggleSection }: FieldsProps) => {
  const styles = useContext(CustomStylesContext);
  const compareMethod = useContext(CompareMethodContext);

  const visibleFields = Object.keys(fields).filter(
    (fieldName) => !HIDDEN_FIELDS.includes(fieldName)
  );

  return (
    <>
      {visibleFields.map((fieldName) => {
        const currentVersion: string = get(fields, [fieldName, 'current_version'], '');
        const mergedVersion: string = get(fields, [fieldName, 'merged_version'], '');

        const oldSource =
          compareMethod === DiffMethod.JSON && typeof currentVersion === 'object'
            ? currentVersion
            : JSON.stringify(currentVersion, null, 2);

        const newSource =
          compareMethod === DiffMethod.JSON && typeof currentVersion === 'object'
            ? mergedVersion
            : JSON.stringify(mergedVersion, null, 2);

        return (
          <>
            <ExpandableSection
              title={fieldName}
              isOpen={openSections[fieldName]}
              toggle={() => {
                toggleSection(fieldName);
              }}
            >
              <ReactDiffViewer
                oldValue={oldSource}
                newValue={newSource}
                splitView={true}
                hideLineNumbers={true}
                compareMethod={compareMethod}
                styles={styles}
              />
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

const sortAndStringifyJson = (jsObject: Record<string, unknown>): string =>
  JSON.stringify(jsObject, Object.keys(jsObject).sort(), 2);

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
  openSections: Record<string, boolean>;
  toggleSection: (sectionName: string) => void;
}

const WholeObjectDiff = ({
  oldRule,
  newRule,
  openSections,
  toggleSection,
}: WholeObjectDiffProps) => {
  const compareMethod = useContext(CompareMethodContext);

  const oldSource =
    compareMethod === DiffMethod.JSON && typeof oldRule === 'object'
      ? oldRule
      : sortAndStringifyJson(oldRule);

  const newSource =
    compareMethod === DiffMethod.JSON && typeof newRule === 'object'
      ? newRule
      : sortAndStringifyJson(newRule);

  const styles = useContext(CustomStylesContext);

  return (
    <>
      <ExpandableSection
        title={'Whole object diff'}
        isOpen={openSections.whole}
        toggle={() => {
          toggleSection('whole');
        }}
      >
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
          compareMethod={compareMethod}
          styles={styles}
        />
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

export const RuleDiffTabReactDiffViewerContinued = ({
  fields,
  oldRule,
  newRule,
}: RuleDiffTabProps) => {
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
      <CompareMethodContext.Provider value={compareMethod}>
        <CustomStyles>
          <WholeObjectDiff
            oldRule={oldRule}
            newRule={newRule}
            openSections={openSections}
            toggleSection={toggleSection}
          />
          <Fields fields={fields} openSections={openSections} toggleSection={toggleSection} />
        </CustomStyles>
      </CompareMethodContext.Provider>
    </>
  );
};
