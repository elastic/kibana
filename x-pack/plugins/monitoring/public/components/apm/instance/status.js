/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import moment from 'moment';
import { SummaryStatus } from '../../summary_status';
import { ApmStatusIcon } from '../status_icon';
import { formatMetric } from '../../../lib/format_number';
import { formatTimestampToDuration } from '../../../../common';
import { CALCULATE_DURATION_SINCE } from '../../../../common/constants';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

function StatusUI({ stats, intl }) {
  const {
    name,
    output,
    version,
    uptime,
    timeOfLastEvent,
  } = stats;

  const metrics = [
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.apm.instance.status.nameLabel',
        defaultMessage: 'Name',
      }),
      value: name,
      'data-test-subj': 'name'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.apm.instance.status.outputLabel',
        defaultMessage: 'Output',
      }),
      value: output,
      'data-test-subj': 'output'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.apm.instance.status.versionLabel',
        defaultMessage: 'Version',
      }),
      value: version,
      'data-test-subj': 'version'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.apm.instance.status.uptimeLabel',
        defaultMessage: 'Uptime',
      }),
      value: formatMetric(uptime, 'time_since'),
      'data-test-subj': 'uptime'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.apm.instance.status.lastEventLabel',
        defaultMessage: 'Last Event',
      }),
      value: intl.formatMessage({
        id: 'xpack.monitoring.apm.instance.status.lastEventDescription',
        defaultMessage: '{timeOfLastEvent} ago' }, {
        timeOfLastEvent: formatTimestampToDuration(+moment(timeOfLastEvent), CALCULATE_DURATION_SINCE)
      }),
      'data-test-subj': 'timeOfLastEvent',
    }
  ];

  const IconComponent = ({ status }) => (
    <Fragment>
      <FormattedMessage
        id="xpack.monitoring.apm.instance.statusDescription"
        defaultMessage="Status: {apmStatusIcon}"
        values={{
          apmStatusIcon: (
            <ApmStatusIcon status={status} />
          )
        }}
      />
    </Fragment>
  );

  return (
    <SummaryStatus
      metrics={metrics}
      IconComponent={IconComponent}
      data-test-subj="apmDetailStatus"
    />
  );
}

export const Status = injectI18n(StatusUI);
