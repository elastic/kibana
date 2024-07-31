/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonGroup, EuiFormRow, type EuiButtonGroupOptionProps } from '@elastic/eui';
import { OverviewMode } from './types';

const overviewModeOptions: EuiButtonGroupOptionProps[] = [
  {
    id: `single`,
    label: (
      <FormattedMessage
        id="xpack.slo.overviewEmbeddable.typeSelector.singleSLOLabel"
        defaultMessage="Single SLO"
      />
    ),
  },
  {
    id: `groups`,
    label: (
      <FormattedMessage
        id="xpack.slo.overviewEmbeddable.typeSelector.groupSLOLabel"
        defaultMessage="Grouped SLOs"
      />
    ),
  },
];

export interface OverviewModeSelectorProps {
  value: string;
  onChange: (update: OverviewMode) => void;
}

export function OverviewModeSelector({ value, onChange }: OverviewModeSelectorProps) {
  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.slo.overviewEmbeddable.viewTypeLabel', {
        defaultMessage: 'View type',
      })}
    >
      <EuiButtonGroup
        data-test-subj="sloOverviewModeSelector"
        isFullWidth
        legend="This is a basic group"
        options={overviewModeOptions}
        idSelected={value}
        onChange={onChange as (id: string) => void}
      />
    </EuiFormRow>
  );
}
