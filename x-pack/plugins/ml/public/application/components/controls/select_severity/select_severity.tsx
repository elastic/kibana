/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering a select element with threshold levels.
 */
import React, { Fragment, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiHealth, EuiSpacer, EuiSuperSelect, EuiText } from '@elastic/eui';

import { getSeverityColor } from '../../../../../common/util/anomaly_utils';
import { usePageUrlState } from '../../../util/url_state';
import { ANOMALY_THRESHOLD } from '../../../../../common';

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
  [warningLabel]: ANOMALY_THRESHOLD.LOW,
  [minorLabel]: ANOMALY_THRESHOLD.MINOR,
  [majorLabel]: ANOMALY_THRESHOLD.MAJOR,
  [criticalLabel]: ANOMALY_THRESHOLD.CRITICAL,
};

interface TableSeverity {
  val: number;
  display: string;
  color: string;
}

export const SEVERITY_OPTIONS: TableSeverity[] = [
  {
    val: ANOMALY_THRESHOLD.LOW,
    display: warningLabel,
    color: getSeverityColor(ANOMALY_THRESHOLD.LOW),
  },
  {
    val: ANOMALY_THRESHOLD.MINOR,
    display: minorLabel,
    color: getSeverityColor(ANOMALY_THRESHOLD.MINOR),
  },
  {
    val: ANOMALY_THRESHOLD.MAJOR,
    display: majorLabel,
    color: getSeverityColor(ANOMALY_THRESHOLD.MAJOR),
  },
  {
    val: ANOMALY_THRESHOLD.CRITICAL,
    display: criticalLabel,
    color: getSeverityColor(ANOMALY_THRESHOLD.CRITICAL),
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

const TABLE_SEVERITY_DEFAULT = SEVERITY_OPTIONS[0];

export const useTableSeverity = (): [TableSeverity, (v: TableSeverity) => void] => {
  return usePageUrlState('mlSelectSeverity', TABLE_SEVERITY_DEFAULT);
};

export const getSeverityOptions = () =>
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
  classNames?: string;
}

export const SelectSeverity: FC<Props> = ({ classNames } = { classNames: '' }) => {
  const [severity, setSeverity] = useTableSeverity();

  const onChange = (valueDisplay: string) => {
    setSeverity(optionValueToThreshold(optionsMap[valueDisplay]));
  };

  return (
    <EuiSuperSelect
      className={classNames}
      hasDividers
      options={getSeverityOptions()}
      valueOfSelected={severity.display}
      onChange={onChange}
    />
  );
};
