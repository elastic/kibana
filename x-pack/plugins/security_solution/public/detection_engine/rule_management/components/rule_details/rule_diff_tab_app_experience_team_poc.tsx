/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import type { Change } from 'diff';
import { diffLines } from 'diff';
import { EuiSpacer, useEuiBackgroundColor, tint } from '@elastic/eui';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';
import { sortAndStringifyJson } from './json_diff/sort_stringify_json';

interface RuleDiffTabProps {
  oldRule: RuleResponse;
  newRule: RuleResponse;
}

export const RuleDiffTabAppExperienceTeamPoc = ({ oldRule, newRule }: RuleDiffTabProps) => {
  const diff = useDiff(oldRule, newRule);

  return (
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
  );
};

const useDiff = (oldRule: RuleResponse, newRule: RuleResponse) => {
  const memoizedDiff = useMemo(() => {
    const oldSource = sortAndStringifyJson(oldRule);
    const newSource = sortAndStringifyJson(newRule);

    return diffLines(JSON.stringify(oldSource), JSON.stringify(newSource), {
      ignoreWhitespace: false,
    });
  }, [oldRule, newRule]);

  return memoizedDiff;
};

// -------------------------------------------------------------------------------------------------
// DiffSegment component

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
