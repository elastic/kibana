/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
// import { Change, diffChars, diffLines, diffWords } from 'diff';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { EuiSpacer, useEuiBackgroundColor, tint } from '@elastic/eui';
import type { RuleFieldsDiff } from '../../../../../common/api/detection_engine/prebuilt_rules/model/diff/rule_diff/rule_diff';

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
}: // matchCss,
// diffCss,
{
  change: Change;
  diffMode: 'lines' | undefined;
  showDiffDecorations: boolean | undefined;
  // matchCss: ReturnType<typeof css>;
  // diffCss: ReturnType<typeof css>;
}) => {
  const matchBackgroundColor = useEuiBackgroundColor('success');
  const diffBackgroundColor = useEuiBackgroundColor('danger');

  const matchCss = css`
    background-color: ${matchBackgroundColor};
    color: ${euiThemeVars.euiColorSuccessText};
  `;
  const diffCss = css`
    background-color: ${diffBackgroundColor};
    color: ${euiThemeVars.euiColorDangerText};
  `;

  const highlightCss = useMemo(
    () => (change.added ? matchCss : change.removed ? diffCss : undefined),
    [change.added, change.removed, diffCss, matchCss]
  );

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
        highlightCss,
        paddingCss,
        decorationCss,
      ]}
    >
      {change.value}
    </div>
  );
};

interface RuleDiffTabProps {
  fields: RuleFieldsDiff;
}

export const RuleDiffTab = ({ fields }: RuleDiffTabProps) => {
  // console.log(fields, diffLines);

  const matchBackgroundColor = useEuiBackgroundColor('success');
  const diffBackgroundColor = useEuiBackgroundColor('danger');

  if (!fields.references) {
    return null;
  }

  const matchCss = css`
    background-color: ${matchBackgroundColor};
    color: ${euiThemeVars.euiColorSuccessText};
  `;
  const diffCss = css`
    background-color: ${diffBackgroundColor};
    color: ${euiThemeVars.euiColorDangerText};
  `;

  // console.log(
  //   'DIFIF',
  //   JSON.stringify(fields.references.current_version),
  //   JSON.stringify(fields.references.merged_version)
  // );

  // const diff = diffLines(
  //   JSON.stringify(fields.references.current_version, null, 2),
  //   JSON.stringify(fields.references.merged_version, null, 2),
  //   { ignoreWhitespace: false }
  // );

  // console.log('!!!DIFF', diff);

  return (
    <>
      <EuiSpacer size="m" />
      {diff.map((change, i) => (
        <DiffSegment
          key={`segment-${i}`}
          change={change}
          diffMode={'lines'}
          showDiffDecorations={true}
          matchCss={matchCss}
          diffCss={diffCss}
        />
      ))}
    </>
  );
};
