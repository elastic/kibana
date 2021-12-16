/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { Legacy } from '../../../legacy_shims';
import moment from 'moment';
import numeral from '@elastic/numeral';
import { capitalize, partial } from 'lodash';
import {
  EuiHealth,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiCallOut,
  EuiSpacer,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { EuiMonitoringTable } from '../../table';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AlertsStatus } from '../../../alerts/status';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../../common/constants';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import './listing.scss';
import { toMountPoint, useKibana } from '../../../../../../../src/plugins/kibana_react/public';

const IsClusterSupported = ({ isSupported, children }) => {
  return isSupported ? children : '-';
};

/*
 * This checks if alerts feature is supported via monitoring cluster
 * license. If the alerts feature is not supported because the prod cluster
 * license is basic, IsClusterSupported makes the status col hidden
 * completely
 */
const IsAlertsSupported = (props) => {
  const { alertsMeta = { enabled: true } } = props.cluster.alerts;
  if (alertsMeta.enabled) {
    return <span>{props.children}</span>;
  }

  const message = i18n.translate('xpack.monitoring.cluster.listing.unknownHealthMessage', {
    defaultMessage: 'Unknown',
  });

  return (
    <EuiToolTip content={message} position="bottom">
      <EuiHealth color="subdued" data-test-subj="alertIcon">
        N/A
      </EuiHealth>
    </EuiToolTip>
  );
};

const STANDALONE_CLUSTER_STORAGE_KEY = 'viewedStandaloneCluster';

const getColumns = (
  showLicenseExpiration,
  changeCluster,
  handleClickIncompatibleLicense,
  handleClickInvalidLicense
) => {
  return [
    {
      name: i18n.translate('xpack.monitoring.cluster.listing.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      field: 'cluster_name',
      sortable: true,
      render: (value, cluster) => {
        if (cluster.isSupported) {
          return (
            <EuiLink
              href={getSafeForExternalLink(`#/overview`, { cluster_uuid: cluster.cluster_uuid })}
              data-test-subj="clusterLink"
            >
              {value}
            </EuiLink>
          );
        }

        // not supported because license is basic/not compatible with multi-cluster
        if (cluster.license) {
          return (
            <EuiLink
              onClick={() => handleClickIncompatibleLicense(cluster.cluster_name)}
              data-test-subj="clusterLink"
            >
              {value}
            </EuiLink>
          );
        }

        // not supported because license is invalid
        return (
          <EuiLink
            onClick={() => handleClickInvalidLicense(cluster.cluster_name)}
            data-test-subj="clusterLink"
          >
            {value}
          </EuiLink>
        );
      },
    },
    {
      name: i18n.translate('xpack.monitoring.cluster.listing.statusColumnTitle', {
        defaultMessage: 'Alerts Status',
      }),
      field: 'status',
      'data-test-subj': 'alertsStatus',
      sortable: true,
      render: (_status, cluster) => (
        <IsClusterSupported {...cluster}>
          <IsAlertsSupported cluster={cluster}>
            <AlertsStatus alerts={cluster.alerts.list} showBadge={false} />
          </IsAlertsSupported>
        </IsClusterSupported>
      ),
    },
    {
      name: i18n.translate('xpack.monitoring.cluster.listing.nodesColumnTitle', {
        defaultMessage: 'Nodes',
      }),
      field: 'elasticsearch.cluster_stats.nodes.count.total',
      'data-test-subj': 'nodesCount',
      sortable: true,
      render: (total, cluster) => (
        <IsClusterSupported {...cluster}>
          {typeof total === 'number' ? numeral(total).format('0,0') : 0}
        </IsClusterSupported>
      ),
    },
    {
      name: i18n.translate('xpack.monitoring.cluster.listing.indicesColumnTitle', {
        defaultMessage: 'Indices',
      }),
      field: 'elasticsearch.cluster_stats.indices.count',
      'data-test-subj': 'indicesCount',
      sortable: true,
      render: (count, cluster) => (
        <IsClusterSupported {...cluster}>{numeral(count).format('0,0')}</IsClusterSupported>
      ),
    },
    {
      name: i18n.translate('xpack.monitoring.cluster.listing.dataColumnTitle', {
        defaultMessage: 'Data',
      }),
      field: 'elasticsearch.cluster_stats.indices.store.size_in_bytes',
      'data-test-subj': 'dataSize',
      sortable: true,
      render: (size, cluster) => (
        <IsClusterSupported {...cluster}>{numeral(size).format('0,0[.]0 b')}</IsClusterSupported>
      ),
    },
    {
      name: i18n.translate('xpack.monitoring.cluster.listing.logstashColumnTitle', {
        defaultMessage: 'Logstash',
      }),
      field: 'logstash.node_count',
      'data-test-subj': 'logstashCount',
      sortable: true,
      render: (count, cluster) => (
        <IsClusterSupported {...cluster}>{numeral(count).format('0,0')}</IsClusterSupported>
      ),
    },
    {
      name: i18n.translate('xpack.monitoring.cluster.listing.kibanaColumnTitle', {
        defaultMessage: 'Kibana',
      }),
      field: 'kibana.count',
      'data-test-subj': 'kibanaCount',
      sortable: true,
      render: (count, cluster) => (
        <IsClusterSupported {...cluster}>{numeral(count).format('0,0')}</IsClusterSupported>
      ),
    },
    {
      name: i18n.translate('xpack.monitoring.cluster.listing.licenseColumnTitle', {
        defaultMessage: 'License',
      }),
      field: 'license.type',
      'data-test-subj': 'clusterLicense',
      sortable: true,
      render: (licenseType, cluster) => {
        const license = cluster.license;

        if (!licenseType) {
          return (
            <div>
              <div className="monTableCell__clusterCellLicense">N/A</div>
            </div>
          );
        }

        if (license) {
          const licenseExpiry = () => {
            if (license.expiry_date_in_millis < moment().valueOf()) {
              // license is expired
              return <span className="monTableCell__clusterCellExpired">Expired</span>;
            }

            // license is fine
            return <span>Expires {moment(license.expiry_date_in_millis).format('D MMM YY')}</span>;
          };

          return (
            <div>
              <div className="monTableCell__clusterCellLicense">{capitalize(licenseType)}</div>
              <div className="monTableCell__clusterCellExpiration">
                {showLicenseExpiration ? licenseExpiry() : null}
              </div>
            </div>
          );
        }

        // there is no license!
        return (
          <EuiLink onClick={() => handleClickInvalidLicense(cluster.cluster_name)}>
            <EuiHealth color="subdued" data-test-subj="alertIcon">
              N/A
            </EuiHealth>
          </EuiLink>
        );
      },
    },
  ];
};

const changeCluster = (scope, globalState, clusterUuid, ccs) => {
  scope.$evalAsync(() => {
    globalState.cluster_uuid = clusterUuid;
    globalState.ccs = ccs;
    globalState.save();
    window.history.replaceState(null, null, '#/overview');
  });
};

const licenseWarning = (scope, { title, text }) => {
  scope.$evalAsync(() => {
    Legacy.shims.toastNotifications.addWarning({
      title,
      text,
      'data-test-subj': 'monitoringLicenseWarning',
    });
  });
};

const handleClickIncompatibleLicense = (scope, theme$, clusterName) => {
  licenseWarning(scope, {
    title: i18n.translate(
      'xpack.monitoring.cluster.listing.incompatibleLicense.warningMessageTitle',
      {
        defaultMessage: "You can't view the {clusterName} cluster",
        values: { clusterName: '"' + clusterName + '"' },
      }
    ),
    text: toMountPoint(
      <Fragment>
        <p>
          <FormattedMessage
            id="xpack.monitoring.cluster.listing.incompatibleLicense.noMultiClusterSupportMessage"
            defaultMessage="The Basic license does not support multi-cluster monitoring."
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.monitoring.cluster.listing.incompatibleLicense.infoMessage"
            defaultMessage="Need to monitor multiple clusters? {getLicenseInfoLink} to enjoy multi-cluster monitoring."
            values={{
              getLicenseInfoLink: (
                <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
                  <FormattedMessage
                    id="xpack.monitoring.cluster.listing.incompatibleLicense.getLicenseLinkLabel"
                    defaultMessage="Get a license with full functionality"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </Fragment>,
      { theme$ }
    ),
  });
};

const handleClickInvalidLicense = (scope, theme$, clusterName) => {
  const licensingPath = `${Legacy.shims.getBasePath()}/app/management/stack/license_management/home`;

  licenseWarning(scope, {
    title: i18n.translate('xpack.monitoring.cluster.listing.invalidLicense.warningMessageTitle', {
      defaultMessage: "You can't view the {clusterName} cluster",
      values: { clusterName: '"' + clusterName + '"' },
    }),
    text: toMountPoint(
      <Fragment>
        <p>
          <FormattedMessage
            id="xpack.monitoring.cluster.listing.invalidLicense.invalidInfoMessage"
            defaultMessage="The license information is invalid."
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.monitoring.cluster.listing.invalidLicense.infoMessage"
            defaultMessage="Need a license? {getBasicLicenseLink} or {getLicenseInfoLink} to enjoy multi-cluster monitoring."
            values={{
              getBasicLicenseLink: (
                <EuiLink href={licensingPath}>
                  <FormattedMessage
                    id="xpack.monitoring.cluster.listing.invalidLicense.getBasicLicenseLinkLabel"
                    defaultMessage="Get a free Basic license"
                  />
                </EuiLink>
              ),
              getLicenseInfoLink: (
                <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
                  <FormattedMessage
                    id="xpack.monitoring.cluster.listing.invalidLicense.getLicenseLinkLabel"
                    defaultMessage="Get a license with full functionality"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </Fragment>,
      { theme$ }
    ),
  });
};

const StandaloneClusterCallout = ({ changeCluster, storage }) => {
  if (storage.get(STANDALONE_CLUSTER_STORAGE_KEY)) {
    return null;
  }

  return (
    <div>
      <EuiCallOut
        color="warning"
        title={i18n.translate('xpack.monitoring.cluster.listing.standaloneClusterCallOutTitle', {
          defaultMessage:
            "It looks like you have instances that aren't connected to an Elasticsearch cluster.",
        })}
        iconType="link"
      >
        <p>
          <EuiLink
            onClick={() => changeCluster(STANDALONE_CLUSTER_CLUSTER_UUID)}
            data-test-subj="standaloneClusterLink"
          >
            <FormattedMessage
              id="xpack.monitoring.cluster.listing.standaloneClusterCallOutLink"
              defaultMessage="View these instances."
            />
          </EuiLink>
          &nbsp;
          <FormattedMessage
            id="xpack.monitoring.cluster.listing.standaloneClusterCallOutText"
            defaultMessage="Or, click Standalone Cluster in the table below"
          />
        </p>
        <p>
          <EuiLink
            onClick={() => {
              storage.set(STANDALONE_CLUSTER_STORAGE_KEY, true);
            }}
          >
            <EuiIcon type="cross" />
            &nbsp;
            <FormattedMessage
              id="xpack.monitoring.cluster.listing.standaloneClusterCallOutDismiss"
              defaultMessage="Dismiss"
            />
          </EuiLink>
        </p>
      </EuiCallOut>
      <EuiSpacer />
    </div>
  );
};

export const Listing = ({ angular, clusters, sorting, pagination, onTableChange }) => {
  const { services } = useKibana();

  const _changeCluster = partial(changeCluster, angular.scope, angular.globalState);
  const _handleClickIncompatibleLicense = partial(
    handleClickIncompatibleLicense,
    angular.scope,
    services.theme.theme$
  );
  const _handleClickInvalidLicense = partial(
    handleClickInvalidLicense,
    angular.scope,
    services.theme.theme$
  );
  const hasStandaloneCluster = !!clusters.find(
    (cluster) => cluster.cluster_uuid === STANDALONE_CLUSTER_CLUSTER_UUID
  );

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          {hasStandaloneCluster ? (
            <StandaloneClusterCallout changeCluster={_changeCluster} storage={angular.storage} />
          ) : null}
          <EuiMonitoringTable
            className="clusterTable"
            rows={clusters}
            columns={getColumns(
              angular.showLicenseExpiration,
              _changeCluster,
              _handleClickIncompatibleLicense,
              _handleClickInvalidLicense
            )}
            rowProps={(item) => {
              return {
                'data-test-subj': `clusterRow_${item.cluster_uuid}`,
              };
            }}
            sorting={{
              ...sorting,
              sort: {
                ...sorting.sort,
                field: 'cluster_name',
              },
            }}
            pagination={pagination}
            search={{
              box: {
                incremental: true,
                placeholder: angular.scope.filterText,
              },
            }}
            onTableChange={onTableChange}
            executeQueryOptions={{
              defaultFields: ['cluster_name'],
            }}
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
