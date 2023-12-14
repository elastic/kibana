/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTextColor,
  EuiTextProps,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';

interface Props {
  id: string;
  title: string;
  isLoading: boolean;
  baseValue: string;
  baseIcon?: string;
  baseColor?: string;
  comparisonValue?: string;
  comparisonPerc?: string;
  comparisonIcon?: string;
  comparisonColor?: string;
  titleHint?: string;
  hasBorder?: boolean;
  size?: EuiTextProps['size'];
}

function Title({ title, size = 'm' }: { title: string; size?: EuiTextProps['size'] }) {
  return (
    <EuiText style={{ fontWeight: 'bold' }} textAlign="left" size={size}>
      {title}
    </EuiText>
  );
}

function BaseValue({
  id,
  value,
  icon,
  color,
  size = 'relative',
}: {
  id: string;
  value: string;
  icon?: string;
  color?: string;
  size?: EuiTextProps['size'];
}) {
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
      {icon ? (
        <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
          <EuiIcon data-test-subj={`${id}_${icon}_${color}`} type={icon} color={color} size="l" />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiText size={size}>
          <EuiTextColor style={{ fontWeight: 'bold' }} color={color} data-test-subj={`${id}_value`}>
            {value}
          </EuiTextColor>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function getValueLable(value: string, perc?: string) {
  return perc ? `${value} (${perc})` : `${value}`;
}

export function SummaryItem({
  id,
  baseValue,
  baseIcon,
  baseColor,
  comparisonValue,
  title,
  isLoading,
  comparisonPerc,
  comparisonColor,
  comparisonIcon,
  titleHint,
  hasBorder = false,
  size = 'm',
}: Props) {
  return (
    <EuiPanel hasShadow={false} hasBorder={hasBorder}>
      <EuiStat
        title={
          <BaseValue id={id} value={baseValue} color={baseColor} icon={baseIcon} size={size} />
        }
        titleSize="m"
        description={
          <>
            {titleHint ? (
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <Title title={title} size={size} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={titleHint}>
                    <EuiIcon type="questionInCircle" />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <Title title={title} size={size} />
            )}
            <EuiSpacer />
          </>
        }
        textAlign="right"
        isLoading={isLoading}
      >
        {!isLoading && comparisonValue ? (
          <EuiText color={comparisonColor} size={size}>
            {comparisonIcon ? (
              <EuiIcon
                data-test-subj={`${id}_comparison_${comparisonIcon}_${comparisonColor}`}
                type={comparisonIcon}
              />
            ) : null}
            <span data-test-subj={`${id}_comparison_value`}>
              {getValueLable(comparisonValue, comparisonPerc)}
            </span>
          </EuiText>
        ) : null}
      </EuiStat>
    </EuiPanel>
  );
}
