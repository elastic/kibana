/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  EuiTitle,
  EuiAccordion,
  EuiSpacer,
  EuiFlexGroup,
  EuiHorizontalRule,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas';
import { RuleAboutSection } from './rule_about_section';
import { RuleDefinitionSection } from './rule_definition_section';
import { RuleScheduleSection } from './rule_schedule_section';
import { RuleSetupGuideSection } from './rule_setup_guide_section';

import * as i18n from './translations';

const defaultOverviewOpenSections = {
  about: true,
  definition: true,
  schedule: true,
  setup: true,
} as const;

type OverviewTabSectionName = keyof typeof defaultOverviewOpenSections;

export const useOverviewTabSections = () => {
  const [expandedOverviewSections, setOpenOverviewSections] = useState(defaultOverviewOpenSections);

  const toggleSection = useCallback((sectionName: OverviewTabSectionName) => {
    setOpenOverviewSections((prevOpenSections) => ({
      ...prevOpenSections,
      [sectionName]: !prevOpenSections[sectionName],
    }));
  }, []);

  const toggleOverviewSection = useMemo(
    () => ({
      about: () => toggleSection('about'),
      definition: () => toggleSection('definition'),
      schedule: () => toggleSection('schedule'),
      setup: () => toggleSection('setup'),
    }),
    [toggleSection]
  );

  return { expandedOverviewSections, toggleOverviewSection };
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

interface RuleOverviewTabProps {
  rule: Partial<RuleResponse>;
  expandedOverviewSections: Record<keyof typeof defaultOverviewOpenSections, boolean>;
  toggleOverviewSection: Record<keyof typeof defaultOverviewOpenSections, () => void>;
}

export const RuleOverviewTab = ({
  rule,
  expandedOverviewSections,
  toggleOverviewSection,
}: RuleOverviewTabProps) => (
  <div
    css={css`
      padding: 0 ${euiThemeVars.euiSizeM};
    `}
  >
    <EuiSpacer size="m" />
    <ExpandableSection
      title={i18n.ABOUT_SECTION_LABEL}
      isOpen={expandedOverviewSections.about}
      toggle={toggleOverviewSection.about}
    >
      <RuleAboutSection rule={rule} />
    </ExpandableSection>
    <EuiHorizontalRule margin="m" />
    <ExpandableSection
      title={i18n.DEFINITION_SECTION_LABEL}
      isOpen={expandedOverviewSections.definition}
      toggle={toggleOverviewSection.definition}
    >
      <RuleDefinitionSection rule={rule} />
    </ExpandableSection>
    <EuiHorizontalRule margin="m" />
    <ExpandableSection
      title={i18n.SCHEDULE_SECTION_LABEL}
      isOpen={expandedOverviewSections.schedule}
      toggle={toggleOverviewSection.schedule}
    >
      <RuleScheduleSection rule={rule} />
    </ExpandableSection>
    <EuiHorizontalRule margin="m" />
    {rule.setup && (
      <>
        <ExpandableSection
          title={i18n.SETUP_GUIDE_SECTION_LABEL}
          isOpen={expandedOverviewSections.setup}
          toggle={toggleOverviewSection.setup}
        >
          <RuleSetupGuideSection setup={rule.setup} />
        </ExpandableSection>
        <EuiHorizontalRule margin="m" />
      </>
    )}
  </div>
);
