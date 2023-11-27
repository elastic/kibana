/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { get } from 'lodash';
import { Change, diffLines } from 'diff';
import {
  EuiSpacer,
  EuiAccordion,
  EuiTitle,
  EuiFlexGroup,
  EuiHorizontalRule,
  useGeneratedHtmlId,
  useEuiBackgroundColor,
  tint,
} from '@elastic/eui';
import type { RuleFieldsDiff } from '../../../../../common/api/detection_engine/prebuilt_rules/model/diff/rule_diff/rule_diff';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';

const HIDDEN_FIELDS = ['meta', 'rule_schedule', 'version'];

const indicatorCss = css`
  position: absolute;
  width: ${euiThemeVars.euiSizeS};
  height: 100%;
  margin-left: calc(-${euiThemeVars.euiSizeS} - calc(${euiThemeVars.euiSizeXS} / 2));
  text-align: center;
  line-height: ${euiThemeVars.euiFontSizeM};
  font-weight: ${euiThemeVars.euiFontWeightMedium};
`;

const matchIndicatorCss = css`
  &:before {
    content: '+';
    ${indicatorCss}
    background-color: ${euiThemeVars.euiColorSuccess};
    color: ${euiThemeVars.euiColorLightestShade};
  }
`;

const diffIndicatorCss = css`
  &:before {
    content: '-';
    ${indicatorCss}
    background-color: ${tint(euiThemeVars.euiColorDanger, 0.25)};
    color: ${euiThemeVars.euiColorLightestShade};
  }
`;

const DiffSegment = ({
  change,
  diffMode,
  showDiffDecorations,
}: {
  change: Change;
  diffMode: 'lines' | undefined;
  showDiffDecorations: boolean | undefined;
}) => {
  const matchBackgroundColor = useEuiBackgroundColor('success');
  const diffBackgroundColor = useEuiBackgroundColor('danger');

  const matchCss = {
    backgroundColor: matchBackgroundColor,
    color: euiThemeVars.euiColorSuccessText,
  };

  const diffCss = {
    backgroundColor: diffBackgroundColor,
    color: euiThemeVars.euiColorDangerText,
  };

  const highlightCss = change.added ? matchCss : change.removed ? diffCss : undefined;

  const paddingCss = useMemo(() => {
    if (diffMode === 'lines') {
      return css`
        padding-left: calc(${euiThemeVars.euiSizeXS} / 2);
      `;
    }
  }, [diffMode]);

  const decorationCss = useMemo(() => {
    if (!showDiffDecorations) {
      return undefined;
    }

    if (diffMode === 'lines') {
      if (change.added) {
        return matchIndicatorCss;
      } else if (change.removed) {
        return diffIndicatorCss;
      }
    } else {
      if (change.added) {
        return css`
          text-decoration: underline;
        `;
      } else if (change.removed) {
        return css`
          text-decoration: line-through;
        `;
      }
    }
  }, [change.added, change.removed, diffMode, showDiffDecorations]);

  return (
    <div
      css={[
        css`
          position: relative;
        `,
        paddingCss,
        decorationCss,
      ]}
      style={highlightCss}
    >
      {change.value}
    </div>
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

        const diff = diffLines(oldSource, newSource, { ignoreWhitespace: false });

        return (
          <>
            <ExpandableSection
              title={fieldName}
              isOpen={openSections[fieldName]}
              toggle={() => {
                toggleSection(fieldName);
              }}
            >
              <>
                <EuiSpacer size="m" />
                {diff.map((change, i) => (
                  <DiffSegment
                    key={`segment-${i}`}
                    change={change}
                    diffMode={'lines'}
                    showDiffDecorations={true}
                  />
                ))}
              </>
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

  const diff = diffLines(JSON.stringify(oldSource), JSON.stringify(newSource), {
    ignoreWhitespace: false,
  });

  return (
    <>
      <ExpandableSection
        title={'Whole object diff'}
        isOpen={openSections.whole}
        toggle={() => {
          toggleSection('whole');
        }}
      >
        <>
          <EuiSpacer size="m" />
          {diff.map((change, i) => (
            <DiffSegment
              key={`segment-${i}`}
              change={change}
              diffMode={'lines'}
              showDiffDecorations={true}
            />
          ))}
        </>
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

export const RuleDiffTabAppExperienceTeamPoc = ({ fields, oldRule, newRule }: RuleDiffTabProps) => {
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
