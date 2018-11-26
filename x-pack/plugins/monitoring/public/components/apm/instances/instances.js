/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { MonitoringTable } from '../../table';
import {
  KuiTableRowCell,
  KuiTableRow
} from '@kbn/ui-framework/components';
import { EuiLink } from '@elastic/eui';
import { Status } from './status';
import { SORT_ASCENDING, SORT_DESCENDING, TABLE_ACTION_UPDATE_FILTER } from '../../../../common/constants';
import { formatMetric } from '../../../lib/format_number';
import { formatTimestampToDuration } from '../../../../common';
import { i18n } from '@kbn/i18n';
import { injectI18n } from '@kbn/i18n/react';


const filterFields = [ 'name', 'type', 'version', 'output' ];
const columns = [
  {
    title: i18n.translate('xpack.monitoring.apm.instances.nameTitle', {
      defaultMessage: 'Name'
    }),
    sortKey: 'name',
    sortOrder: SORT_ASCENDING
  },
  {
    title: i18n.translate('xpack.monitoring.apm.instances.outputEnabledTitle', {
      defaultMessage: 'Output Enabled'
    }),
    sortKey: 'output'
  },
  {
    title: i18n.translate('xpack.monitoring.apm.instances.totalEventsRateTitle', {
      defaultMessage: 'Total Events Rate'
    }),
    sortKey: 'total_events_rate',
    secondarySortOrder: SORT_DESCENDING
  },
  {
    title: i18n.translate('xpack.monitoring.apm.instances.bytesSentRateTitle', {
      defaultMessage: 'Bytes Sent Rate'
    }),
    sortKey: 'bytes_sent_rate'
  },
  {
    title: i18n.translate('xpack.monitoring.apm.instances.outputErrorsTitle', {
      defaultMessage: 'Output Errors'
    }),
    sortKey: 'errors'
  },
  {
    title: i18n.translate('xpack.monitoring.apm.instances.lastEventTitle', {
      defaultMessage: 'Last Event'
    }),
    sortKey: 'time_of_last_event'
  },
  {
    title: i18n.translate('xpack.monitoring.apm.instances.allocatedMemoryTitle', {
      defaultMessage: 'Allocated Memory'
    }),
    sortKey: 'memory'
  },
  {
    title: i18n.translate('xpack.monitoring.apm.instances.versionTitle', {
      defaultMessage: 'Version'
    }),
    sortKey: 'version'
  },
];
const instanceRowFactory = () => {
  return function KibanaRow(props) {
    const applyFiltering = filterText => () => {
      props.dispatchTableAction(TABLE_ACTION_UPDATE_FILTER, filterText);
    };

    return (
      <KuiTableRow>
        <KuiTableRowCell>
          <div className="monTableCell__name">
            <EuiLink
              href={`#/apm/instances/${props.uuid}`}
              data-test-subj={`apmLink-${props.name}`}
            >
              {props.name}
            </EuiLink>
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          {props.output}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatMetric(props.total_events_rate, '', '/s')}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatMetric(props.bytes_sent_rate, 'byte', '/s')}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatMetric(props.errors, '0')}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatTimestampToDuration(+moment(props.time_of_last_event), 'since') + ' ago'}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatMetric(props.memory, 'byte')}
        </KuiTableRowCell>
        <KuiTableRowCell>
          <EuiLink
            onClick={applyFiltering(props.version)}
          >
            {props.version}
          </EuiLink>
        </KuiTableRowCell>
      </KuiTableRow>
    );
  };
};

function ApmServerInstancesUI({ apms, intl }) {
  const {
    pageIndex,
    filterText,
    sortKey,
    sortOrder,
    onNewState,
  } = apms;

  return (
    <div>
      <Status stats={apms.data.stats}/>
      <MonitoringTable
        className="apmInstancesTable"
        rows={apms.data.apms}
        pageIndex={pageIndex}
        filterText={filterText}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onNewState={onNewState}
        placeholder={intl.formatMessage({
          id: 'xpack.monitoring.apm.instances.filterInstancesPlaceholder',
          defaultMessage: 'Filter Instances…'
        })}
        filterFields={filterFields}
        columns={columns}
        rowComponent={instanceRowFactory()}
      />
    </div>
  );
}

export const ApmServerInstances = injectI18n(ApmServerInstancesUI);
