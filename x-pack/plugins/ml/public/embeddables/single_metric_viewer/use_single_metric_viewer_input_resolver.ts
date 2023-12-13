/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { Observable } from 'rxjs';
import {
  SingleMetricViewerEmbeddableInput,
  // AnomalyChartsEmbeddableOutput,
} from '..';

// { "searchSessionId": "37a186b8-1c00-47c5-b1e3-9af04762e909", "refreshConfig": { "pause": true, "value": 0 }, "filters": [], "hidePanelTitles": false, "executionContext": { "type": "dashboard", "description": "[Flights] Global Flight Dashboard" }, "syncTooltips": false, "syncColors": false, "viewMode": "edit", "query": { "language": "kuery", "query": "" }, "id": "86c25295-4331-4b08-a4fb-a345be5581c1", "timeRange": { "from": "now-7d", "to": "now" }, "jobIds": [ "price-by-carrier" ], "title": "ML single metric viewer chart for price-by-carrier", "functionDescription": "", "panelTitle": "ML single metric viewer chart for price-by-carrier", "selectedDetectorIndex": 0, "selectedEntities": { "Carrier": "ES-Air" } }

export function useSingleMetricViwerInputResolver(
  embeddableInput: Observable<SingleMetricViewerEmbeddableInput>
) {
  const [data, setData] = useState<any>();
  useEffect(function subscribeToEmbeddableInput() {
    const subscription = embeddableInput.subscribe((input) => {
      setData(input);
    });
    return () => subscription.unsubscribe();
  });

  return data;
}
