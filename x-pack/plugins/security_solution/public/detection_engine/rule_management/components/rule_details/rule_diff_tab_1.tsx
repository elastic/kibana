/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { Change, diffLines } from 'diff';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
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

  // return (
  //   <>
  //     {visibleFields.map((fieldName) => (
  //       <div>
  //         {fieldName} {typeof fields[fieldName]?.current_version}
  //       </div>
  //     ))}
  //   </>
  // );

  return (
    <>
      {visibleFields.map((fieldName) => {
        const diff = diffLines(
          typeof fields[fieldName].current_version === 'string'
            ? fields[fieldName].current_version
            : JSON.stringify(fields[fieldName].current_version, null, 2),
          typeof fields[fieldName].merged_version === 'string'
            ? fields[fieldName].merged_version
            : JSON.stringify(fields[fieldName].merged_version, null, 2),
          { ignoreWhitespace: false }
        );

        return (
          <>
            <ExpandableSection
              title={FIELD_CONFIG_BY_NAME[fieldName]?.label ?? fieldName.toUpperCase()}
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

const WholeObjectDiff = ({ currentRule, mergedRule, openSections, toggleSection }) => {
  const diff = diffLines(JSON.stringify(currentRule), JSON.stringify(mergedRule), {
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
    </>
  );
};
