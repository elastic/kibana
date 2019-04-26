import { fetch } from '../../common/lib/fetch';
import { createUiMetricUri } from '../../../../common/ui_metric';

const APP = 'canvas';

export const trackUiMetric = (uiMetric: string): void => {
  const uri = createUiMetricUri(APP, uiMetric);
  return fetch.post(uri);
};
