/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering a select element with threshold levels.
 * This is basically a copy of SelectSeverity in public/application/components/controls/select_severity
 * but which stores its state internally rather than in the appState
 */
import React, { Fragment, FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiHealth, EuiSpacer, EuiSuperSelect, EuiText } from '@elastic/eui';

import { getSeverityColor } from '../../../../../../common/util/anomaly_utils';

const warningLabel = i18n.translate('xpack.ml.controls.selectSeverity.warningLabel', {
  defaultMessage: 'warning',
});
const minorLabel = i18n.translate('xpack.ml.controls.selectSeverity.minorLabel', {
  defaultMessage: 'minor',
});
const majorLabel = i18n.translate('xpack.ml.controls.selectSeverity.majorLabel', {
  defaultMessage: 'major',
});
const criticalLabel = i18n.translate('xpack.ml.controls.selectSeverity.criticalLabel', {
  defaultMessage: 'critical',
});

const optionsMap = {
  [warningLabel]: 0,
  [minorLabel]: 25,
  [majorLabel]: 50,
  [criticalLabel]: 75,
};

interface TableSeverity {
  val: number;
  display: string;
  color: string;
}

export const SEVERITY_OPTIONS: TableSeverity[] = [
  {
    val: 0,
    display: warningLabel,
    color: getSeverityColor(0),
  },
  {
    val: 25,
    display: minorLabel,
    color: getSeverityColor(25),
  },
  {
    val: 50,
    display: majorLabel,
    color: getSeverityColor(50),
  },
  {
    val: 75,
    display: criticalLabel,
    color: getSeverityColor(75),
  },
];

function optionValueToThreshold(value: number) {
  // Get corresponding threshold object with required display and val properties from the specified value.
  let threshold = SEVERITY_OPTIONS.find((opt) => opt.val === value);

  // Default to warning if supplied value doesn't map to one of the options.
  if (threshold === undefined) {
    threshold = SEVERITY_OPTIONS[0];
  }

  return threshold;
}

export const DEFAULT_WATCH_SEVERITY = SEVERITY_OPTIONS[3];

const getSeverityOptions = () =>
  SEVERITY_OPTIONS.map(({ color, display, val }) => ({
    value: display,
    inputDisplay: (
      <Fragment>
        <EuiHealth color={color} style={{ lineHeight: 'inherit' }}>
          {display}
        </EuiHealth>
      </Fragment>
    ),
    dropdownDisplay: (
      <Fragment>
        <EuiHealth color={color} style={{ lineHeight: 'inherit' }}>
          {display}
        </EuiHealth>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p className="euiTextColor--subdued">
            <FormattedMessage
              id="xpack.ml.controls.selectSeverity.scoreDetailsDescription"
              defaultMessage="score {value} and above"
              values={{ value: val }}
            />
          </p>
        </EuiText>
      </Fragment>
    ),
  }));

interface Props {
  onChange: (sev: TableSeverity) => void;
}

export const SelectSeverity: FC<Props> = ({ onChange }) => {
  const [severity, setSeverity] = useState(DEFAULT_WATCH_SEVERITY);

  const onSeverityChange = (valueDisplay: string) => {
    const option = optionValueToThreshold(optionsMap[valueDisplay]);
    setSeverity(option);
    onChange(option);
  };

  return (
    <EuiSuperSelect
      hasDividers
      options={getSeverityOptions()}
      valueOfSelected={severity.display}
      onChange={onSeverityChange}
    />
  );
};
