/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './chart_switch.scss';
import React from 'react';
import { EuiFlexItem, EuiIconTip, EuiBetaBadge, EuiFlexGroup, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

export const getDataLossWarning = (dataLoss: 'nothing' | 'layers' | 'everything' | 'columns') => {
  if (dataLoss === 'nothing') {
    return;
  }
  if (dataLoss === 'everything') {
    return i18n.translate('xpack.lens.chartSwitch.dataLossEverything', {
      defaultMessage: 'Changing to this visualization clears the current configuration.',
    });
  }
  if (dataLoss === 'layers') {
    return i18n.translate('xpack.lens.chartSwitch.dataLossLayersDescription', {
      defaultMessage:
        'Changing to this visualization modifies currently selected layer`s configuration and removes all other layers.',
    });
  } else
    return i18n.translate('xpack.lens.chartSwitch.dataLossColumns', {
      defaultMessage: `Changing to this visualization modifies the current configuration.`,
    });
};

const DataLossWarning = ({ content, id }: { content?: string; id: string }) => {
  if (!content) return null;
  return (
    <EuiFlexItem grow={false}>
      <EuiIconTip
        size="s"
        aria-label={content}
        type="dot"
        color="warning"
        content={content}
        iconProps={{
          className: 'lnsChartSwitch__chartIcon',
          'data-test-subj': `lnsChartSwitchPopoverAlert_${id}`,
        }}
      />
    </EuiFlexItem>
  );
};

export const ExperimentalBadge = () => {
  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip
        content={i18n.translate('xpack.lens.chartSwitch.experimentalLabel', {
          defaultMessage: 'Technical preview',
        })}
      >
        <EuiBetaBadge
          css={css`
            vertical-align: middle;
          `}
          iconType="beaker"
          label={i18n.translate('xpack.lens.chartSwitch.experimentalLabel', {
            defaultMessage: 'Technical preview',
          })}
          size="s"
        />
      </EuiToolTip>
    </EuiFlexItem>
  );
};

export const ChartOptionAppend = ({
  dataLoss,
  showExperimentalBadge,
  id,
}: {
  dataLoss: 'nothing' | 'layers' | 'everything' | 'columns';
  showExperimentalBadge?: boolean;
  id: string;
}) => (
  <EuiFlexGroup
    gutterSize="xs"
    responsive={false}
    alignItems="center"
    className="lnsChartSwitch__append"
  >
    {showExperimentalBadge ? <ExperimentalBadge /> : null}
    <DataLossWarning content={getDataLossWarning(dataLoss)} id={id} />
  </EuiFlexGroup>
);
