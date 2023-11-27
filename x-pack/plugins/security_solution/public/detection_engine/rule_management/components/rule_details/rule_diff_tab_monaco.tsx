/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { CodeEditorField } from '@kbn/kibana-react-plugin/public';
import { XJsonLang } from '@kbn/monaco';
import { get } from 'lodash';
import {
  EuiSpacer,
  EuiAccordion,
  EuiTitle,
  EuiFlexGroup,
  EuiHorizontalRule,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { RuleFieldsDiff } from '../../../../../common/api/detection_engine/prebuilt_rules/model/diff/rule_diff/rule_diff';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';

const HIDDEN_FIELDS = ['meta', 'rule_schedule', 'version'];

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
  return (
    <>
      <ExpandableSection
        title={'Whole object diff'}
        isOpen={openSections.whole}
        toggle={() => {
          toggleSection('whole');
        }}
      >
        <CodeEditorField
          aria-label={''}
          languageId={XJsonLang.ID}
          original={sortAndStringifyJson(oldRule)}
          value={sortAndStringifyJson(newRule)}
          fullWidth={true}
          height="500px"
          options={{
            accessibilitySupport: 'off',
            fontSize: 12,
            tabSize: 2,
            automaticLayout: true,
            minimap: { enabled: false },
            overviewRulerBorder: false,
            scrollbar: { alwaysConsumeMouseWheel: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            readOnly: true,
            domReadOnly: true,
            renderSideBySide: true,
            useInlineViewWhenSpaceIsLimited: true,
            renderSideBySideInlineBreakpoint: 100,
            diffAlgorithm: 'advanced',
            lineNumbers: 'off',
          }}
        />
      </ExpandableSection>
      <EuiHorizontalRule margin="m" />
    </>
  );
};

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
              <CodeEditorField
                aria-label={''}
                languageId={XJsonLang.ID}
                original={oldSource}
                value={newSource}
                // value={'ABC'}
                // onChange={onRulesChange}
                fullWidth={true}
                height="300px"
                options={{
                  accessibilitySupport: 'off',
                  //   lineNumbers: 'on',
                  fontSize: 12,
                  tabSize: 2,
                  automaticLayout: true,
                  minimap: { enabled: false },
                  overviewRulerBorder: false,
                  scrollbar: { alwaysConsumeMouseWheel: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  wrappingIndent: 'indent',
                  //   readOnly: true,
                  domReadOnly: true,
                  // ToDo: there does not appear to be a way to disable the read-only tooltip
                  // Fortunately this only gets displayed when the 'delete' key is pressed.
                  renderSideBySide: true,
                  useInlineViewWhenSpaceIsLimited: true,
                  renderSideBySideInlineBreakpoint: 100,
                  diffAlgorithm: 'advanced',
                  readOnly: true,
                  lineNumbers: 'off',
                }}
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

interface RuleDiffTabProps {
  oldRule: RuleResponse;
  newRule: RuleResponse;
  fields: Partial<RuleFieldsDiff>;
}

export const RuleDiffTabMonaco = ({ fields, oldRule, newRule }: RuleDiffTabProps) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.keys(fields).reduce((sections, fieldName) => ({ ...sections, [fieldName]: true }), {})
  );

  const toggleSection = (sectionName: string) => {
    setOpenSections((prevOpenSections) => ({
      ...prevOpenSections,
      [sectionName]: !prevOpenSections[sectionName],
    }));
  };

  return (
    <>
      <EuiSpacer size="m" />
      <WholeObjectDiff
        oldRule={oldRule}
        newRule={newRule}
        openSections={openSections}
        toggleSection={toggleSection}
      />
      <Fields fields={fields} openSections={openSections} toggleSection={toggleSection} />
    </>
  );
};
