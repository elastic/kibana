/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Subject } from 'rxjs';

import { AppUpdater } from 'src/core/public';
import { LicenseType } from '../../../../licensing/common/types';
import { SecuritySubPluginNames, SecurityDeepLinks } from '../types';
import { AppMeta } from '../../../../../../src/core/public';

const securityDeepLinks: SecurityDeepLinks = {
  detections: {
    base: [
      {
        id: 'siemDetectionRules',
        title: i18n.translate('xpack.securitySolution.search.detections.manage', {
          defaultMessage: 'Manage Rules',
        }),
        keywords: ['rules'],
        path: '/rules',
      },
    ],
  },
  hosts: {
    base: [
      {
        id: 'authentications',
        title: i18n.translate('xpack.securitySolution.search.hosts.authentications', {
          defaultMessage: 'Authentications',
        }),
        path: '/authentications',
      },
      {
        id: 'uncommonProcesses',
        title: i18n.translate('xpack.securitySolution.search.hosts.uncommonProcesses', {
          defaultMessage: 'Uncommon Processes',
        }),
        path: '/uncommonProcesses',
      },
      {
        id: 'events',
        title: i18n.translate('xpack.securitySolution.search.hosts.events', {
          defaultMessage: 'Events',
        }),
        path: '/events',
      },
      {
        id: 'externalAlerts',
        title: i18n.translate('xpack.securitySolution.search.hosts.externalAlerts', {
          defaultMessage: 'External Alerts',
        }),
        path: '/alerts',
      },
    ],
    premium: [
      {
        id: 'anomalies',
        title: i18n.translate('xpack.securitySolution.search.hosts.anomalies', {
          defaultMessage: 'Anomalies',
        }),
        path: '/anomalies',
      },
    ],
  },
  network: {
    base: [
      {
        id: 'dns',
        title: i18n.translate('xpack.securitySolution.search.network.dns', {
          defaultMessage: 'DNS',
        }),
        path: '/dns',
      },
      {
        id: 'http',
        title: i18n.translate('xpack.securitySolution.search.network.http', {
          defaultMessage: 'HTTP',
        }),
        path: '/http',
      },
      {
        id: 'tls',
        title: i18n.translate('xpack.securitySolution.search.network.tls', {
          defaultMessage: 'TLS',
        }),
        path: '/tls',
      },
      {
        id: 'externalAlertsNetwork',
        title: i18n.translate('xpack.securitySolution.search.network.externalAlerts', {
          defaultMessage: 'External Alerts',
        }),
        path: '/external-alerts',
      },
    ],
    premium: [
      {
        id: 'anomalies',
        title: i18n.translate('xpack.securitySolution.search.hosts.anomalies', {
          defaultMessage: 'Anomalies',
        }),
        path: '/anomalies',
      },
    ],
  },
  timelines: {
    base: [
      {
        id: 'timelineTemplates',
        title: i18n.translate('xpack.securitySolution.search.timeline.templates', {
          defaultMessage: 'Templates',
        }),
        path: '/template',
      },
    ],
  },
  overview: {
    base: [],
  },
  case: {
    base: [
      {
        id: 'create',
        title: i18n.translate('xpack.securitySolution.search.cases.create', {
          defaultMessage: 'Create New Case',
        }),
        path: '/create',
      },
    ],
    premium: [
      {
        id: 'configure',
        title: i18n.translate('xpack.securitySolution.search.cases.configure', {
          defaultMessage: 'Configure Cases',
        }),
        path: '/configure',
      },
    ],
  },
  administration: {
    base: [
      {
        id: 'trustApplications',
        title: i18n.translate('xpack.securitySolution.search.administration.trustedApps', {
          defaultMessage: 'Trusted Applications',
        }),
        path: '/trusted_apps',
      },
    ],
  },
};

const subpluginKeywords: { [key in SecuritySubPluginNames]: string[] } = {
  detections: [
    i18n.translate('xpack.securitySolution.search.detections', {
      defaultMessage: 'Detections',
    }),
  ],
  hosts: [
    i18n.translate('xpack.securitySolution.search.hosts', {
      defaultMessage: 'Hosts',
    }),
  ],
  network: [
    i18n.translate('xpack.securitySolution.search.network', {
      defaultMessage: 'Network',
    }),
  ],
  timelines: [
    i18n.translate('xpack.securitySolution.search.timelines', {
      defaultMessage: 'Timelines',
    }),
  ],
  overview: [
    i18n.translate('xpack.securitySolution.search.overview', {
      defaultMessage: 'Overview',
    }),
  ],
  case: [
    i18n.translate('xpack.securitySolution.search.cases', {
      defaultMessage: 'Cases',
    }),
  ],
  administration: [
    i18n.translate('xpack.securitySolution.search.administration', {
      defaultMessage: 'Endpoint Administration',
    }),
  ],
};

/**
 * A function that generates a subPlugin's meta tag
 * @param subPluginName SubPluginName of the app to retrieve meta information for.
 * @param licenseType optional string for license level, if not provided basic is assumed.
 */
export function getSearchDeepLinksAndKeywords(
  subPluginName: SecuritySubPluginNames,
  licenseType?: LicenseType
): AppMeta {
  const baseRoutes = [...securityDeepLinks[subPluginName].base];
  if (
    licenseType === 'gold' ||
    licenseType === 'platinum' ||
    licenseType === 'enterprise' ||
    licenseType === 'trial'
  ) {
    const premiumRoutes =
      securityDeepLinks[subPluginName] && securityDeepLinks[subPluginName].premium;
    if (premiumRoutes !== undefined) {
      return {
        keywords: subpluginKeywords[subPluginName],
        searchDeepLinks: [...baseRoutes, ...premiumRoutes],
      };
    }
  }
  return {
    keywords: subpluginKeywords[subPluginName],
    searchDeepLinks: baseRoutes,
  };
}
/**
 * A function that updates a subplugin's meta property as appropriate when license level changes.
 * @param subPluginName SubPluginName of the app to register searchDeepLinks for
 * @param appUpdater an instance of appUpdater$ observable to update search links when needed.
 * @param licenseType A string representing the current license level.
 */
export function registerSearchLinks(
  subPluginName: SecuritySubPluginNames,
  appUpdater?: Subject<AppUpdater>,
  licenseType?: LicenseType
) {
  if (appUpdater !== undefined) {
    appUpdater.next(() => ({
      meta: getSearchDeepLinksAndKeywords(subPluginName, licenseType),
    }));
  }
}
