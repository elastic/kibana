/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
} from '@elastic/eui';

export const CronYearly = ({
  minute,
  minuteOptions,
  hour,
  hourOptions,
  date,
  dateOptions,
  month,
  monthOptions,
  onChange,
}) => (
  <Fragment>
    <EuiFlexItem grow={false} className="rollupJobWizardCronEditorField">
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          {i18n.translate('xpack.rollupJobs.cronEditor.cronYearly.textOnThe.label', {
            defaultMessage: 'on the',
          })}
        </EuiFlexItem>

        <EuiFlexItem grow={false} className="rollupJobWizardCronEditorField">
          <EuiSelect
            options={dateOptions}
            value={date}
            onChange={e => onChange({ date: e.target.value })}
            fullWidth
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          {i18n.translate('xpack.rollupJobs.cronEditor.cronYearly.textOf.label', {
            defaultMessage: 'of',
          })}
        </EuiFlexItem>

        <EuiFlexItem grow={false} className="rollupJobWizardCronEditorField">
          <EuiSelect
            options={monthOptions}
            value={month}
            onChange={e => onChange({ month: e.target.value })}
            fullWidth
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>

    <EuiFlexItem grow={false} className="rollupJobWizardCronEditorField">
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          {i18n.translate('xpack.rollupJobs.cronEditor.cronYearly.textAt.label', {
            defaultMessage: 'at',
          })}
        </EuiFlexItem>

        <EuiFlexItem grow={false} className="rollupJobWizardCronEditorField">
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false} className="rollupJobWizardCronEditorField">
              <EuiSelect
                options={hourOptions}
                value={hour}
                onChange={e => onChange({ hour: e.target.value })}
                fullWidth
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              :
            </EuiFlexItem>

            <EuiFlexItem grow={false} className="rollupJobWizardCronEditorField">
              <EuiSelect
                options={minuteOptions}
                value={minute}
                onChange={e => onChange({ minute: e.target.value })}
                fullWidth
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </Fragment>
);

CronYearly.propTypes = {
  minute: PropTypes.string.isRequired,
  minuteOptions: PropTypes.array.isRequired,
  hour: PropTypes.string.isRequired,
  hourOptions: PropTypes.array.isRequired,
  date: PropTypes.string.isRequired,
  dateOptions: PropTypes.array.isRequired,
  month: PropTypes.string.isRequired,
  monthOptions: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};
