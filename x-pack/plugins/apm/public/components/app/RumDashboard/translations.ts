/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const EndUserExperienceLabel = i18n.translate(
  'xpack.apm.rum.dashboard.title',
  {
    defaultMessage: 'End User Experience',
  }
);

export const getWhatIsGoingOnLabel = (environmentVal: string) =>
  i18n.translate('xpack.apm.rum.dashboard.environment.title', {
    defaultMessage: `What's going on in {environmentVal}?`,
    values: { environmentVal },
  });

export const BackEndLabel = i18n.translate('xpack.apm.rum.dashboard.backend', {
  defaultMessage: 'Backend',
});

export const FrontEndLabel = i18n.translate(
  'xpack.apm.rum.dashboard.frontend',
  {
    defaultMessage: 'Frontend',
  }
);

export const PageViewsLabel = i18n.translate(
  'xpack.apm.rum.dashboard.pageViews',
  {
    defaultMessage: 'Page views',
  }
);

export const DateTimeLabel = i18n.translate(
  'xpack.apm.rum.dashboard.dateTime.label',
  {
    defaultMessage: 'Date / Time',
  }
);

export const PercPageLoadedLabel = i18n.translate(
  'xpack.apm.rum.dashboard.pagesLoaded.label',
  {
    defaultMessage: 'Pages loaded',
  }
);

export const PageLoadTimeLabel = i18n.translate(
  'xpack.apm.rum.dashboard.pageLoadTime.label',
  {
    defaultMessage: 'Page load time (seconds)',
  }
);

export const PageLoadDistLabel = i18n.translate(
  'xpack.apm.rum.dashboard.pageLoadDistribution.label',
  {
    defaultMessage: 'Page load distribution',
  }
);

export const ResetZoomLabel = i18n.translate(
  'xpack.apm.rum.dashboard.resetZoom.label',
  {
    defaultMessage: 'Reset zoom',
  }
);
