/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLoadingContent,
  EuiStat,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
export const getDeltaPercent = (current: number, previous?: number | null) => {
  if (previous === 0 || previous === null || previous === undefined) {
    return 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(0));
};
export const ThresholdIndicator = ({
  description,
  helpText,
  loading,
  current,
  previous,
  previousFormatted,
  currentFormatted,
  asStat = false,
}: {
  description?: string;
  helpText?: string;
  loading: boolean;
  current: number;
  previous?: number | null;
  previousFormatted: string;
  currentFormatted: string;
  asStat?: boolean;
  setHasAnyDelta?: (hasDelta: boolean) => void;
}) => {
  if (loading) {
    return <EuiLoadingContent lines={1} />;
  }
  const delta = getDeltaPercent(current, previous);

  const getToolTipContent = () => {
    return i18n.translate('xpack.synthetics.stepDetails.palette.tooltip', {
      defaultMessage: 'Value is {deltaLabel} compared to previous steps in last 24 hours.',
      values: {
        deltaLabel:
          Math.abs(delta) === 0
            ? i18n.translate('xpack.synthetics.stepDetails.palette.tooltip.noChange', {
                defaultMessage: 'same',
              })
            : delta > 0
            ? i18n.translate('xpack.synthetics.stepDetails.palette.increased', {
                defaultMessage: '{delta}% higher',
                values: { delta },
              })
            : i18n.translate('xpack.synthetics.stepDetails.palette.decreased', {
                defaultMessage: '{delta}% lower',
                values: { delta: Math.abs(delta) },
              }),
      },
    });
  };

  const getColor = () => {
    if (Math.abs(delta) < 5) {
      return 'default';
    }
    return delta > 5 ? 'danger' : 'success';
  };

  const hasDelta = Math.abs(delta) > 0;

  const content =
    previous === null ? (
      <EuiIcon type="minus" size={asStat ? 'l' : 'm'} color="subdued" />
    ) : (
      <EuiToolTip
        content={getToolTipContent()}
        title={i18n.translate('xpack.synthetics.stepDetails.palette.previous', {
          defaultMessage: 'Median(24h): {previous}',
          values: { previous: previousFormatted },
        })}
      >
        {hasDelta ? (
          <EuiIcon
            type={delta > 0 ? 'sortUp' : 'sortDown'}
            size={asStat ? 'l' : 'm'}
            color={getColor()}
          />
        ) : (
          <EuiIcon type="minus" size={asStat ? 'l' : 'm'} color="subdued" />
        )}
      </EuiToolTip>
    );

  if (asStat) {
    return (
      <EuiStat
        titleSize="s"
        titleColor={getColor()}
        description={
          <span>
            {description} {helpText && <EuiIconTip content={helpText} position="right" />}
          </span>
        }
        title={
          <>
            {currentFormatted}
            <span style={{ marginLeft: 5 }}>{content}</span>
          </>
        }
        reverse={true}
      />
    );
  }

  return (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText color={getColor()}>
          <strong>{currentFormatted}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{content}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
