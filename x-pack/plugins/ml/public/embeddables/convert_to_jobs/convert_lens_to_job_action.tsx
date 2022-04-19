/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import React from 'react';
import rison from 'rison-node';
// import { CoreStart } from 'kibana/public';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
// import { VIEW_BY_JOB_LABEL } from '../../application/explorer/explorer_constants';
// import { toMountPoint, wrapWithTheme } from '../../../../../../src/plugins/kibana_react/public';
// import { AnomalyDetectorService } from '../../application/services/anomaly_detector_service';
// import { getDefaultExplorerChartsPanelTitle } from './anomaly_charts_embeddable';
// import { HttpService } from '../../application/services/http_service';
// import { AnomalyChartsEmbeddableInput } from '..';
// import { resolveJobSelection } from '../common/resolve_job_selection';
// import { AnomalyChartsInitializer } from './anomaly_charts_initializer';

export function convertLensToADJob(embeddable: IEmbeddable) {
  // @ts-expect-error savedVis not in type
  const { from, to } = embeddable.input.timeRange;
  // @ts-expect-error savedVis not in type
  const { query, filters } = embeddable.input;
  // @ts-expect-error savedVis not in type
  const vis = rison.encode(embeddable.savedVis);
  const queryRison = rison.encode(query);
  const filtersRison = rison.encode(filters);
  const url = `ml/jobs/new_job/from_lens?vis=${vis}&from=${from}&to=${to}&query=${queryRison}&filters=${filtersRison}`;

  // const url = `ml/jobs/new_job/from_lens?lensId=${embeddable.input.savedObjectId}&from=${from}&to=${to}`;
  // console.log(url);
  window.open(url, '_blank');
}
