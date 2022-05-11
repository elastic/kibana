/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '../../../../app/types';

export { getDetectionEngineUrl } from '../redirect_to_detection_engine';
export { getAppLandingUrl } from '../redirect_to_landing';
export { getHostDetailsUrl, getHostsUrl } from '../redirect_to_hosts';
export { getNetworkUrl, getNetworkDetailsUrl } from '../redirect_to_network';
export { getTimelineTabsUrl, getTimelineUrl } from '../redirect_to_timelines';
export {
  getCaseDetailsUrl,
  getCaseUrl,
  getCreateCaseUrl,
  getConfigureCasesUrl,
} from '../redirect_to_case';

export const useFormatUrl = (page: SecurityPageName) => ({
  formatUrl: (path: string) => path,
  search: '',
});
