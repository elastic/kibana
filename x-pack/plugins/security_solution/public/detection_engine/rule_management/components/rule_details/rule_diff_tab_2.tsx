/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
// import ReactDiffViewer from 'react-diff-viewer';
import ReactDiffViewer from 'react-diff-viewer-continued';
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
  fields: Partial<RuleFieldsDiff>;
}

export const RuleDiffTab = ({ fields }: RuleDiffTabProps) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.keys(fields).reduce((sections, fieldName) => ({ ...sections, [fieldName]: true }), {})
  );

  const toggleSection = (sectionName: string) => {
    setOpenSections((prevOpenSections) => ({
      ...prevOpenSections,
      [sectionName]: !prevOpenSections[sectionName],
    }));
  };

  if (!fields.references && !fields.risk_score) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <ExpandableSection
        title={'EQL query'}
        isOpen={openSections.eql_query}
        toggle={() => {
          toggleSection('eql_query');
        }}
      >
        <ReactDiffViewer
          oldValue={JSON.stringify(fields.eql_query.current_version.query, null, 2)}
          newValue={JSON.stringify(fields.eql_query.merged_version.query, null, 2)}
          splitView={true}
          hideLineNumbers={true}
          compareMethod={'diffChars'}
        />
      </ExpandableSection>
      <EuiHorizontalRule margin="m" />
      <ExpandableSection
        title={i18n.REFERENCES_FIELD_LABEL}
        isOpen={openSections.references}
        toggle={() => {
          toggleSection('references');
        }}
      >
        <ReactDiffViewer
          oldValue={JSON.stringify(fields.references.current_version, null, 2)}
          newValue={JSON.stringify(fields.references.merged_version, null, 2)}
          splitView={true}
          hideLineNumbers={true}
        />
      </ExpandableSection>
      <EuiHorizontalRule margin="m" />
      <ExpandableSection
        title={i18n.RISK_SCORE_FIELD_LABEL}
        isOpen={openSections.risk_score}
        toggle={() => {
          toggleSection('risk_score');
        }}
      >
        <ReactDiffViewer
          oldValue={JSON.stringify(fields.risk_score.current_version)}
          newValue={JSON.stringify(fields.risk_score.merged_version)}
          splitView={true}
          hideLineNumbers={true}
        />
      </ExpandableSection>
    </>
  );
};
