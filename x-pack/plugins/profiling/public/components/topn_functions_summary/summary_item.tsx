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
}

function Title({ title }: { title: string }) {
  return (
    <EuiText style={{ fontWeight: 'bold' }} textAlign="left">
      {title}
    </EuiText>
  );
}

function BaseValue({
  id,
  value,
  icon,
  color,
}: {
  id: string;
  value: string;
  icon?: string;
  color?: string;
}) {
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
      {icon ? (
        <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
          <EuiIcon data-test-subj={`${id}_${icon}_${color}`} type={icon} color={color} size="l" />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiTextColor style={{ fontWeight: 'bold' }} color={color} data-test-subj={`${id}_value`}>
          {value}
        </EuiTextColor>
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
}: Props) {
  return (
    <EuiPanel hasShadow={false}>
      <EuiStat
        title={<BaseValue id={id} value={baseValue} color={baseColor} icon={baseIcon} />}
        titleSize="m"
        description={
          <>
            {titleHint ? (
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <Title title={title} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={titleHint}>
                    <EuiIcon type="questionInCircle" />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <Title title={title} />
            )}
            <EuiSpacer />
          </>
        }
        textAlign="right"
        isLoading={isLoading}
      >
        {!isLoading && comparisonValue ? (
          <EuiText color={comparisonColor}>
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
