/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const I18LABELS = {
  endUserExperience: i18n.translate('xpack.apm.rum.dashboard.title', {
    defaultMessage: 'End User Experience',
  }),
  getWhatIsGoingOn: (environmentVal: string) =>
    i18n.translate('xpack.apm.rum.dashboard.environment.title', {
      defaultMessage: `What's going on in {environmentVal}?`,
      values: { environmentVal },
    }),
  backEnd: i18n.translate('xpack.apm.rum.dashboard.backend', {
    defaultMessage: 'Backend',
  }),
  frontEnd: i18n.translate('xpack.apm.rum.dashboard.frontend', {
    defaultMessage: 'Frontend',
  }),
  pageViews: i18n.translate('xpack.apm.rum.dashboard.pageViews', {
    defaultMessage: 'Page views',
  }),
  dateTime: i18n.translate('xpack.apm.rum.dashboard.dateTime.label', {
    defaultMessage: 'Date / Time',
  }),
  percPageLoaded: i18n.translate('xpack.apm.rum.dashboard.pagesLoaded.label', {
    defaultMessage: 'Pages loaded',
  }),
  pageLoadTime: i18n.translate('xpack.apm.rum.dashboard.pageLoadTime.label', {
    defaultMessage: 'Page load time (seconds)',
  }),
  pageLoadTimes: i18n.translate('xpack.apm.rum.dashboard.pageLoadTimes.label', {
    defaultMessage: 'Page load times',
  }),
  pageLoadDistribution: i18n.translate(
    'xpack.apm.rum.dashboard.pageLoadDistribution.label',
    {
      defaultMessage: 'Page load distribution',
    }
  ),
  resetZoom: i18n.translate('xpack.apm.rum.dashboard.resetZoom.label', {
    defaultMessage: 'Reset zoom',
  }),
  overall: i18n.translate('xpack.apm.rum.dashboard.overall.label', {
    defaultMessage: 'Overall',
  }),
  selectBreakdown: i18n.translate('xpack.apm.rum.filterGroup.selectBreakdown', {
    defaultMessage: 'Select breakdown',
  }),
  breakdown: i18n.translate('xpack.apm.rum.filterGroup.breakdown', {
    defaultMessage: 'Breakdown',
  }),
  seconds: i18n.translate('xpack.apm.rum.filterGroup.seconds', {
    defaultMessage: 'seconds',
  }),
};
