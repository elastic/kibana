/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import { uniq, get } from 'lodash';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiLink,
  EuiScreenReaderOnly,
  EuiPanel,
} from '@elastic/eui';
import { Stats } from '..';
import { formatMetric } from '../../../lib/format_number';
import { EuiMonitoringTable } from '../../table';
import { i18n } from '@kbn/i18n';
import { BEATS_SYSTEM_ID } from '../../../../common/constants';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import { ListingCallOut } from '../../setup_mode/listing_callout';
import { SetupModeBadge } from '../../setup_mode/badge';
import { FormattedMessage } from '@kbn/i18n-react';
import { isSetupModeFeatureEnabled } from '../../../lib/setup_mode';
import { SetupModeFeature } from '../../../../common/enums';

export class Listing extends PureComponent {
  getColumns() {
    const setupMode = this.props.setupMode;

    return [
      {
        name: i18n.translate('xpack.monitoring.beats.instances.nameTitle', {
          defaultMessage: 'Name',
        }),
        field: 'name',
        render: (name, beat) => {
          let setupModeStatus = null;
          if (isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
            const list = get(setupMode, 'data.byUuid', {});
            const status = list[beat.uuid] || {};
            const instance = {
              uuid: beat.uuid,
              name: beat.name,
            };

            setupModeStatus = (
              <div className="monTableCell__setupModeStatus">
                <SetupModeBadge
                  setupMode={setupMode}
                  status={status}
                  instance={instance}
                  productName={BEATS_SYSTEM_ID}
                />
              </div>
            );
          }

          return (
            <div>
              <EuiLink
                href={getSafeForExternalLink(`#/beats/beat/${beat.uuid}`)}
                data-test-subj={`beatLink-${name}`}
              >
                {name}
              </EuiLink>
              {setupModeStatus}
            </div>
          );
        },
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.typeTitle', {
          defaultMessage: 'Type',
        }),
        field: 'type',
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.outputEnabledTitle', {
          defaultMessage: 'Output Enabled',
        }),
        field: 'output',
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.totalEventsRateTitle', {
          defaultMessage: 'Total Events Rate',
        }),
        field: 'total_events_rate',
        render: (value) => formatMetric(value, '', '/s'),
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.bytesSentRateTitle', {
          defaultMessage: 'Bytes Sent Rate',
        }),
        field: 'bytes_sent_rate',
        render: (value) => formatMetric(value, 'byte', '/s'),
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.outputErrorsTitle', {
          defaultMessage: 'Output Errors',
        }),
        field: 'errors',
        render: (value) => formatMetric(value, '0'),
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.allocatedMemoryTitle', {
          defaultMessage: 'Allocated Memory',
        }),
        field: 'memory',
        render: (value) => formatMetric(value, 'byte'),
      },
      {
        name: i18n.translate('xpack.monitoring.beats.instances.versionTitle', {
          defaultMessage: 'Version',
        }),
        field: 'version',
      },
    ];
  }

  render() {
    const { stats, data, sorting, pagination, onTableChange, setupMode } = this.props;

    let setupModeCallOut = null;
    if (isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
      setupModeCallOut = (
        <ListingCallOut
          setupModeData={setupMode.data}
          useNodeIdentifier={false}
          productName={BEATS_SYSTEM_ID}
        />
      );
    }

    const types = uniq(data.map((item) => item.type)).map((type) => {
      return { value: type };
    });

    const versions = uniq(data.map((item) => item.version)).map((version) => {
      return { value: version };
    });

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiScreenReaderOnly>
            <h1>
              <FormattedMessage
                id="xpack.monitoring.beats.listing.heading"
                defaultMessage="Beats listing"
              />
            </h1>
          </EuiScreenReaderOnly>
          <EuiPanel>
            <Stats stats={stats} />
          </EuiPanel>
          <EuiSpacer size="m" />
          <EuiPageContent>
            {setupModeCallOut}
            <EuiMonitoringTable
              className="beatsTable"
              rows={data}
              setupMode={setupMode}
              productName={BEATS_SYSTEM_ID}
              columns={this.getColumns()}
              sorting={sorting}
              pagination={pagination}
              search={{
                box: {
                  incremental: true,
                  placeholder: i18n.translate('xpack.monitoring.beats.filterBeatsPlaceholder', {
                    defaultMessage: 'Filter Beats...',
                  }),
                },
                filters: [
                  {
                    type: 'field_value_selection',
                    field: 'type',
                    name: i18n.translate('xpack.monitoring.beats.instances.typeFilter', {
                      defaultMessage: 'Type',
                    }),
                    options: types,
                    multiSelect: 'or',
                  },
                  {
                    type: 'field_value_selection',
                    field: 'version',
                    name: i18n.translate('xpack.monitoring.beats.instances.versionFilter', {
                      defaultMessage: 'Version',
                    }),
                    options: versions,
                    multiSelect: 'or',
                  },
                ],
              }}
              onTableChange={onTableChange}
              executeQueryOptions={{
                defaultFields: ['name', 'type'],
              }}
            />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
