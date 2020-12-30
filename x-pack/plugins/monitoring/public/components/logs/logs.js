/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { PureComponent } from 'react';
import { upperFirst } from 'lodash';
import { Legacy } from '../../legacy_shims';
import { EuiBasicTable, EuiTitle, EuiSpacer, EuiText, EuiCallOut, EuiLink } from '@elastic/eui';
import { INFRA_SOURCE_ID } from '../../../common/constants';
import { formatDateTimeLocal } from '../../../common/formatting';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Reason } from './reason';

const getFormattedDateTimeLocal = (timestamp) => {
  const injector = Legacy.shims.getAngularInjector();
  const timezone = injector.get('config').get('dateFormat:tz');
  return formatDateTimeLocal(timestamp, timezone);
};

const columnTimestampTitle = i18n.translate('xpack.monitoring.logs.listing.timestampTitle', {
  defaultMessage: 'Timestamp',
});

const columnLevelTitle = i18n.translate('xpack.monitoring.logs.listing.levelTitle', {
  defaultMessage: 'Level',
});

const columnTypeTitle = i18n.translate('xpack.monitoring.logs.listing.typeTitle', {
  defaultMessage: 'Type',
});

const columnMessageTitle = i18n.translate('xpack.monitoring.logs.listing.messageTitle', {
  defaultMessage: 'Message',
});

const columnComponentTitle = i18n.translate('xpack.monitoring.logs.listing.componentTitle', {
  defaultMessage: 'Component',
});

const columnNodeTitle = i18n.translate('xpack.monitoring.logs.listing.nodeTitle', {
  defaultMessage: 'Node',
});

const columns = [
  {
    field: 'timestamp',
    name: columnTimestampTitle,
    width: '12%',
    render: (timestamp) => getFormattedDateTimeLocal(timestamp),
  },
  {
    field: 'level',
    name: columnLevelTitle,
    width: '5%',
  },
  {
    field: 'type',
    name: columnTypeTitle,
    width: '10%',
    render: (type) => upperFirst(type),
  },
  {
    field: 'message',
    name: columnMessageTitle,
    width: '55%',
  },
  {
    field: 'component',
    name: columnComponentTitle,
    width: '18%',
  },
];

const clusterColumns = [
  {
    field: 'timestamp',
    name: columnTimestampTitle,
    width: '12%',
    render: (timestamp) => getFormattedDateTimeLocal(timestamp),
  },
  {
    field: 'level',
    name: columnLevelTitle,
    width: '5%',
  },
  {
    field: 'type',
    name: columnTypeTitle,
    width: '10%',
    render: (type) => upperFirst(type),
  },
  {
    field: 'message',
    name: columnMessageTitle,
    width: '45%',
  },
  {
    field: 'component',
    name: columnComponentTitle,
    width: '15%',
  },
  {
    field: 'node',
    name: columnNodeTitle,
    width: '13%',
  },
];

function getLogsUiLink(clusterUuid, nodeId, indexUuid) {
  const base = `${Legacy.shims.getBasePath()}/app/logs/link-to/${INFRA_SOURCE_ID}/logs`;

  const params = [];
  if (clusterUuid) {
    params.push(`elasticsearch.cluster.uuid:${clusterUuid}`);
  }
  if (nodeId) {
    params.push(`elasticsearch.node.id:${nodeId}`);
  }
  if (indexUuid) {
    params.push(`elasticsearch.index.name:${indexUuid}`);
  }

  if (params.length === 0) {
    return base;
  }

  return `${base}?filter=${params.join(' and ')}`;
}

export class Logs extends PureComponent {
  renderLogs() {
    const {
      logs: { enabled, logs },
      nodeId,
      indexUuid,
    } = this.props;
    if (!enabled) {
      return null;
    }

    return (
      <EuiBasicTable items={logs || []} columns={nodeId || indexUuid ? columns : clusterColumns} />
    );
  }

  renderNoLogs() {
    const {
      logs: { enabled, reason },
    } = this.props;
    if (enabled) {
      return null;
    }

    return <Reason reason={reason} />;
  }

  renderCallout() {
    const uiCapabilities = Legacy.shims.capabilities;
    const show = uiCapabilities.logs && uiCapabilities.logs.show;
    const {
      logs: { enabled },
      nodeId,
      clusterUuid,
      indexUuid,
    } = this.props;
    if (!enabled || !show) {
      return null;
    }

    return (
      <EuiCallOut
        size="m"
        title={i18n.translate('xpack.monitoring.logs.listing.calloutTitle', {
          defaultMessage: 'Want to see more log entries?',
        })}
        iconType="logsApp"
      >
        <p>
          <FormattedMessage
            id="xpack.monitoring.logs.listing.linkText"
            defaultMessage="Visit {link} to dive deeper."
            values={{
              link: (
                <EuiLink href={getLogsUiLink(clusterUuid, nodeId, indexUuid)}>
                  {i18n.translate('xpack.monitoring.logs.listing.calloutLinkText', {
                    defaultMessage: 'Logs',
                  })}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
    );
  }

  render() {
    const {
      nodeId,
      indexUuid,
      logs: { limit },
    } = this.props;

    let description;

    if (nodeId) {
      description = i18n.translate('xpack.monitoring.logs.listing.nodePageDescription', {
        defaultMessage:
          'Showing the most recent log entries for this node, up to {limit} total log entries.',
        values: {
          limit,
        },
      });
    } else if (indexUuid) {
      description = i18n.translate('xpack.monitoring.logs.listing.indexPageDescription', {
        defaultMessage:
          'Showing the most recent log entries for this index, up to {limit} total log entries.',
        values: {
          limit,
        },
      });
    } else {
      description = i18n.translate('xpack.monitoring.logs.listing.clusterPageDescription', {
        defaultMessage:
          'Showing the most recent log entries for this cluster, up to {limit} total log entries.',
        values: {
          limit,
        },
      });
    }

    return (
      <div>
        <EuiTitle>
          <h1>
            {i18n.translate('xpack.monitoring.logs.listing.pageTitle', {
              defaultMessage: 'Recent Log Entries',
            })}
          </h1>
        </EuiTitle>
        <EuiText size="s">
          <p>{description}</p>
        </EuiText>
        <EuiSpacer size="m" />
        {this.renderLogs()}
        {this.renderNoLogs()}
        <EuiSpacer size="m" />
        {this.renderCallout()}
      </div>
    );
  }
}
