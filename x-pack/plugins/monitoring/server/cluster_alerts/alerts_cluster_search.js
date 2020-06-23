/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import moment from 'moment';
import { verifyMonitoringLicense } from './verify_monitoring_license';
import { i18n } from '@kbn/i18n';

/**
 * Retrieve any statically defined cluster alerts (not indexed) for the {@code cluster}.
 *
 * In the future, if we add other static cluster alerts, then we should probably just return an array.
 * It may also make sense to put this into its own file in the future.
 *
 * @param {Object} cluster The cluster object containing the cluster's license.
 * @return {Object} The alert to use for the cluster. {@code null} if none.
 */
export function staticAlertForCluster(cluster) {
  const clusterNeedsTLSEnabled = get(cluster, 'license.cluster_needs_tls', false);

  if (clusterNeedsTLSEnabled) {
    const versionParts = get(cluster, 'version', '').split('.');
    const version = versionParts.length > 1 ? `${versionParts[0]}.${versionParts[1]}` : 'current';

    return {
      metadata: {
        severity: 0,
        cluster_uuid: cluster.cluster_uuid,
        link: `https://www.elastic.co/guide/en/x-pack/${version}/ssl-tls.html`,
      },
      update_timestamp: cluster.timestamp,
      timestamp: get(cluster, 'license.issue_date', cluster.timestamp),
      prefix: i18n.translate('xpack.monitoring.clusterAlerts.clusterNeedsTSLEnabledDescription', {
        defaultMessage:
          'Configuring TLS will be required to apply a Gold or Platinum license when security is enabled.',
      }),
      message: i18n.translate('xpack.monitoring.clusterAlerts.seeDocumentationDescription', {
        defaultMessage: 'See documentation for details.',
      }),
    };
  }

  return null;
}

/**
 * Append the static alert(s) for this {@code cluster}, limiting the response to {@code size} {@code alerts}.
 *
 * @param {Object} cluster The cluster object containing the cluster's license.
 * @param {Array} alerts The existing cluster alerts.
 * @param {Number} size The maximum size.
 * @return {Array} The alerts array (modified or not).
 */
export function appendStaticAlerts(cluster, alerts, size) {
  const staticAlert = staticAlertForCluster(cluster);

  if (staticAlert) {
    // we can put it over any resolved alert, or anything with a lower severity (which is currently none)
    // the alerts array is pre-sorted from highest severity to lowest; unresolved alerts are at the bottom
    const alertIndex = alerts.findIndex(
      (alert) => alert.resolved_timestamp || alert.metadata.severity < staticAlert.metadata.severity
    );

    if (alertIndex !== -1) {
      // we can put it in the place of this alert
      alerts.splice(alertIndex, 0, staticAlert);
    } else {
      alerts.push(staticAlert);
    }

    // chop off the last item if necessary (when size is < alerts.length)
    return alerts.slice(0, size);
  }

  return alerts;
}

/**
 * Create a filter that should be used when no time range is supplied and thus only un-resolved cluster alerts should
 * be returned.
 *
 * @return {Object} Query to restrict to un-resolved cluster alerts.
 */
export function createFilterForUnresolvedAlerts() {
  return {
    bool: {
      must_not: {
        exists: {
          field: 'resolved_timestamp',
        },
      },
    },
  };
}

/**
 * Create a filter that should be used when {@code options} has start or end times.
 *
 * This enables us to search for cluster alerts that have been resolved within the given time frame, while also
 * grabbing any un-resolved cluster alerts.
 *
 * @param {Object} options The options for the cluster search.
 * @return {Object} Query to restrict to un-resolved cluster alerts or cluster alerts resolved within the time range.
 */
export function createFilterForTime(options) {
  const timeFilter = {};

  if (options.start) {
    timeFilter.gte = moment.utc(options.start).valueOf();
  }

  if (options.end) {
    timeFilter.lte = moment.utc(options.end).valueOf();
  }

  return {
    bool: {
      should: [
        {
          range: {
            resolved_timestamp: {
              format: 'epoch_millis',
              ...timeFilter,
            },
          },
        },
        {
          bool: {
            must_not: {
              exists: {
                field: 'resolved_timestamp',
              },
            },
          },
        },
      ],
    },
  };
}

/**
 * @param {Object} req Request object from the API route
 * @param {String} cluster The cluster being checked
 */
export function alertsClusterSearch(req, alertsIndex, cluster, checkLicense, options = {}) {
  const verification = verifyMonitoringLicense(req.server);

  if (!verification.enabled) {
    return Promise.resolve({ message: verification.message });
  }

  const license = get(cluster, 'license', {});
  const prodLicenseInfo = checkLicense(license.type, license.status === 'active', 'production');

  if (prodLicenseInfo.clusterAlerts.enabled) {
    const config = req.server.config();
    const size = options.size || config.get('monitoring.ui.max_bucket_size');

    const params = {
      index: alertsIndex,
      ignoreUnavailable: true,
      filterPath: 'hits.hits._source',
      body: {
        size,
        query: {
          bool: {
            must: [
              {
                // This will cause anything un-resolved to be sorted above anything that is resolved
                // From there, those items are sorted by their severity, then by their timestamp (age)
                function_score: {
                  boost_mode: 'max',
                  functions: [
                    {
                      filter: {
                        bool: {
                          must_not: [
                            {
                              exists: {
                                field: 'resolved_timestamp',
                              },
                            },
                          ],
                        },
                      },
                      weight: 2,
                    },
                  ],
                },
              },
            ],
            filter: [
              {
                term: { 'metadata.cluster_uuid': cluster.cluster_uuid },
              },
            ],
          },
        },
        sort: [
          '_score',
          { 'metadata.severity': { order: 'desc' } },
          { timestamp: { order: 'asc' } },
        ],
      },
    };

    if (options.start || options.end) {
      params.body.query.bool.filter.push(createFilterForTime(options));
    } else {
      params.body.query.bool.filter.push(createFilterForUnresolvedAlerts());
    }

    const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
    return callWithRequest(req, 'search', params).then((result) => {
      const hits = get(result, 'hits.hits', []);
      const alerts = hits.map((alert) => alert._source);

      return appendStaticAlerts(cluster, alerts, size);
    });
  }

  return Promise.resolve({ message: prodLicenseInfo.message });
}
