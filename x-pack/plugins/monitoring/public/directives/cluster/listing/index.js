/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { render } from 'react-dom';
import { capitalize, partial } from 'lodash';
import moment from 'moment';
import numeral from '@elastic/numeral';
import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';
import {
  EuiHealth,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { EuiMonitoringTable } from 'plugins/monitoring/components/table';
import { Tooltip } from 'plugins/monitoring/components/tooltip';
import { AlertsIndicator } from 'plugins/monitoring/components/cluster/listing/alerts_indicator';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

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
  const {
    alertsMeta = { enabled: true },
    clusterMeta = { enabled: true }
  } = props.cluster.alerts;
  if (alertsMeta.enabled && clusterMeta.enabled) {
    return <span>{ props.children }</span>;
  }

  const message = alertsMeta.message || clusterMeta.message;
  return (
    <Tooltip
      text={message}
      placement="bottom"
      trigger="hover"
    >
      <EuiHealth color="subdued" data-test-subj="alertIcon">
        N/A
      </EuiHealth>
    </Tooltip>
  );
};

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
              onClick={() => changeCluster(cluster.cluster_uuid, cluster.ccs)}
              data-test-subj="clusterLink"
            >
              { value }
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
              { value }
            </EuiLink>
          );
        }

        // not supported because license is invalid
        return (
          <EuiLink
            onClick={() => handleClickInvalidLicense(cluster.cluster_name)}
            data-test-subj="clusterLink"
          >
            { value }
          </EuiLink>
        );
      }
    },
    {
      name: i18n.translate('xpack.monitoring.cluster.listing.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      field: 'status',
      'data-test-subj': 'alertsStatus',
      sortable: true,
      render: (_status, cluster) => (
        <IsClusterSupported {...cluster}>
          <IsAlertsSupported cluster={cluster}>
            <AlertsIndicator alerts={cluster.alerts} />
          </IsAlertsSupported>
        </IsClusterSupported>
      )
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
          { numeral(total).format('0,0') }
        </IsClusterSupported>
      )
    },
    {
      name: i18n.translate('xpack.monitoring.cluster.listing.indicesColumnTitle', {
        defaultMessage: 'Indices',
      }),
      field: 'elasticsearch.cluster_stats.indices.count',
      'data-test-subj': 'indicesCount',
      sortable: true,
      render: (count, cluster) => (
        <IsClusterSupported {...cluster}>
          { numeral(count).format('0,0') }
        </IsClusterSupported>
      )
    },
    {
      name: i18n.translate('xpack.monitoring.cluster.listing.dataColumnTitle', {
        defaultMessage: 'Data',
      }),
      field: 'elasticsearch.cluster_stats.indices.store.size_in_bytes',
      'data-test-subj': 'dataSize',
      sortable: true,
      render: (size, cluster) => (
        <IsClusterSupported {...cluster}>
          { numeral(size).format('0,0[.]0 b')}
        </IsClusterSupported>
      )
    },
    {
      name: i18n.translate('xpack.monitoring.cluster.listing.logstashColumnTitle', {
        defaultMessage: 'Logstash',
      }),
      field: 'logstash.node_count',
      'data-test-subj': 'logstashCount',
      sortable: true,
      render: (count, cluster) => (
        <IsClusterSupported {...cluster}>
          { numeral(count).format('0,0') }
        </IsClusterSupported>
      )
    },
    {
      name: i18n.translate('xpack.monitoring.cluster.listing.kibanaColumnTitle', {
        defaultMessage: 'Kibana',
      }),
      field: 'kibana.count',
      'data-test-subj': 'kibanaCount',
      sortable: true,
      render: (count, cluster) => (
        <IsClusterSupported {...cluster}>
          { numeral(count).format('0,0') }
        </IsClusterSupported>
      )
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
        if (license) {
          const licenseExpiry = () => {
            if (license.expiry_date_in_millis < moment().valueOf()) {
              // license is expired
              return (
                <span className="monTableCell__clusterCellExpired">
                  Expired
                </span>
              );
            }

            // license is fine
            return (
              <span>
                Expires { moment(license.expiry_date_in_millis).format('D MMM YY') }
              </span>
            );
          };

          return (
            <div>
              <div className="monTableCell__clusterCellLiscense">
                { capitalize(licenseType) }
              </div>
              <div className="monTableCell__clusterCellExpiration">
                { showLicenseExpiration ? licenseExpiry() : null }
              </div>
            </div>
          );
        }

        // there is no license!
        return (
          <EuiLink
            onClick={() => handleClickInvalidLicense(cluster.cluster_name)}
          >
            <EuiHealth color="subdued" data-test-subj="alertIcon">
              N/A
            </EuiHealth>
          </EuiLink>
        );
      }
    }
  ];
};

const changeCluster = (scope, globalState, kbnUrl, clusterUuid, ccs) => {
  scope.$evalAsync(() => {
    globalState.cluster_uuid = clusterUuid;
    globalState.ccs = ccs;
    globalState.save();
    kbnUrl.changePath('/overview');
  });
};

const licenseWarning = (scope, { title, text }) => {
  scope.$evalAsync(() => {
    toastNotifications.addWarning({ title, text, 'data-test-subj': 'monitoringLicenseWarning' });
  });
};

const handleClickIncompatibleLicense = (scope, clusterName) => {
  licenseWarning(scope, {
    title: (
      <FormattedMessage
        id="xpack.monitoring.cluster.listing.incompatibleLicense.warningMessageTitle"
        defaultMessage="You can't view the {clusterName} cluster"
        values={{ clusterName: '"' + clusterName + '"' }}
      />
    ),
    text: (
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
                <a href="https://www.elastic.co/subscriptions/xpack" target="_blank">
                  <FormattedMessage
                    id="xpack.monitoring.cluster.listing.incompatibleLicense.getLicenseLinkLabel"
                    defaultMessage="Get a license with full functionality"
                  />
                </a>
              )
            }}
          />
        </p>
      </Fragment>
    ),
  });
};

const handleClickInvalidLicense = (scope, clusterName) => {
  const licensingPath = `${chrome.getBasePath()}/app/kibana#/management/elasticsearch/license_management/home`;

  licenseWarning(scope, {
    title: (
      <FormattedMessage
        id="xpack.monitoring.cluster.listing.invalidLicense.warningMessageTitle"
        defaultMessage="You can't view the {clusterName} cluster"
        values={{ clusterName: '"' + clusterName + '"' }}
      />
    ),
    text: (
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
                <a href={licensingPath}>
                  <FormattedMessage
                    id="xpack.monitoring.cluster.listing.invalidLicense.getBasicLicenseLinkLabel"
                    defaultMessage="Get a free Basic license"
                  />
                </a>
              ),
              getLicenseInfoLink: (
                <a href="https://www.elastic.co/subscriptions/xpack" target="_blank">
                  <FormattedMessage
                    id="xpack.monitoring.cluster.listing.invalidLicense.getLicenseLinkLabel"
                    defaultMessage="get a license with full functionality"
                  />
                </a>
              )
            }}
          />
        </p>
      </Fragment>
    ),
  });
};

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringClusterListing', ($injector) => {
  return {
    restrict: 'E',
    scope: {
      clusters: '=',
      sorting: '=',
      filterText: '=',
      paginationSettings: '=pagination',
      onTableChange: '=',
    },
    link(scope, $el) {
      const globalState = $injector.get('globalState');
      const kbnUrl = $injector.get('kbnUrl');
      const showLicenseExpiration = $injector.get('showLicenseExpiration');

      const _changeCluster = partial(changeCluster, scope, globalState, kbnUrl);
      const _handleClickIncompatibleLicense = partial(handleClickIncompatibleLicense, scope);
      const _handleClickInvalidLicense = partial(handleClickInvalidLicense, scope);

      const { sorting, pagination, onTableChange } = scope;

      scope.$watch('clusters', (clusters = []) => {
        const clusterTable = (
          <I18nProvider>
            <EuiPage>
              <EuiPageBody>
                <EuiPageContent>
                  <EuiMonitoringTable
                    className="clusterTable"
                    rows={clusters}
                    columns={getColumns(
                      showLicenseExpiration,
                      _changeCluster,
                      _handleClickIncompatibleLicense,
                      _handleClickInvalidLicense
                    )}
                    rowProps={item => {
                      return {
                        'data-test-subj': `clusterRow_${item.cluster_uuid}`
                      };
                    }}
                    sorting={{
                      ...sorting,
                      sort: {
                        ...sorting.sort,
                        field: 'cluster_name'
                      }
                    }}
                    pagination={pagination}
                    search={{
                      box: {
                        incremental: true,
                        placeholder: scope.filterText
                      },
                    }}
                    onTableChange={onTableChange}
                  />
                </EuiPageContent>
              </EuiPageBody>
            </EuiPage>
          </I18nProvider>
        );
        render(clusterTable, $el[0]);
      });

    }
  };
});
