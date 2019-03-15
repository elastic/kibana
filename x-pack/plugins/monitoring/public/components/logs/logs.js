/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { PureComponent } from 'react';
import { capitalize } from 'lodash';
import chrome from 'ui/chrome';
import {
  EuiBasicTable,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { formatDateTimeLocal } from '../../../common/formatting';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

const columns = [
  {
    field: 'timestamp',
    name: i18n.translate('xpack.monitoring.logs.listing.timestampTitle', {
      defaultMessage: 'Timestamp'
    }),
    width: '12%',
    render: timestamp => formatDateTimeLocal(timestamp),
  },
  {
    field: 'level',
    name: i18n.translate('xpack.monitoring.logs.listing.levelTitle', {
      defaultMessage: 'Level'
    }),
    width: '5%',
  },
  {
    field: 'type',
    name: i18n.translate('xpack.monitoring.logs.listing.typeTitle', {
      defaultMessage: 'Type'
    }),
    width: '10%',
    render: type => capitalize(type),
  },
  {
    field: 'message',
    name: i18n.translate('xpack.monitoring.logs.listing.messageTitle', {
      defaultMessage: 'Message'
    }),
    width: '55%'
  },
  {
    field: 'component',
    name: i18n.translate('xpack.monitoring.logs.listing.componentTitle', {
      defaultMessage: 'Component'
    }),
    width: '18%'
  },
];

function getLogsUiLink(clusterUuid, nodeId) {
  const base = `${chrome.getBasePath()}/app/infra#/link-to/logs`;

  const params = [];
  if (clusterUuid) {
    params.push(`elasticsearch.cluster.uuid:${clusterUuid}`);
  }
  if (nodeId) {
    params.push(`elasticsearch.node.id:${nodeId}`);
  }

  if (params.length === 0) {
    return base;
  }

  return `${base}?filter=${params.join(' and ')}`;
}

export class Logs extends PureComponent {
  render() {
    const { clusterUuid, nodeId, logs }  = this.props;

    return (
      <div>
        <EuiTitle>
          <h1>
            {i18n.translate('xpack.monitoring.logs.listing.pageTitle', {
              defaultMessage: 'Logs'
            })}
          </h1>
        </EuiTitle>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.monitoring.logs.listing.pageDescription', {
              defaultMessage: 'Showing the most recent logs, up to 10 total logs'
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m"/>
        <EuiBasicTable
          items={logs || []}
          columns={columns}
        />
        <EuiSpacer size="m"/>
        <EuiCallOut
          size="m"
          title={i18n.translate('xpack.monitoring.logs.listing.calloutTitle', {
            defaultMessage: 'Want to see more logs?'
          })}
          iconType="loggingApp"
        >
          <p>
            <FormattedMessage
              id="xpack.monitoring.logs.listing.linkText"
              defaultMessage="Visit the {link} to dive deeper."
              values={{
                link: (
                  <EuiLink href={getLogsUiLink(clusterUuid, nodeId)}>
                    {i18n.translate('xpack.monitoring.logs.listing.calloutLinkText', {
                      defaultMessage: 'Logs UI'
                    })}
                  </EuiLink>
                )
              }}
            />
          </p>
        </EuiCallOut>
      </div>
    );
  }
}
