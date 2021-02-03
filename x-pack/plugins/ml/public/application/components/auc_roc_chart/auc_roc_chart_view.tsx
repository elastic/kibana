/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useEffect, FC } from 'react';

// There is still an issue with Vega Lite's typings with the strict mode Kibana is using.
// @ts-ignore
import { compile } from 'vega-lite/build-es5/vega-lite';
import { parse, View, Warn } from 'vega';
import { Handler } from 'vega-tooltip';

import { htmlIdGenerator } from '@elastic/eui';

import { getAucRocChartVegaLiteSpec } from './auc_roc_chart_vega_lite_spec';

export interface AucRocChartViewProps {
  data: any[];
}

export const AucRocChartView: FC<AucRocChartViewProps> = ({ data }) => {
  const htmlId = useMemo(() => htmlIdGenerator()(), []);

  useEffect(() => {
    const vegaSpec = getAucRocChartVegaLiteSpec(data);

    const vgSpec = compile(vegaSpec).spec;

    const view = new View(parse(vgSpec))
      .logLevel(Warn)
      .renderer('canvas')
      .tooltip(new Handler().call)
      .initialize(`#${htmlId}`);

    view.runAsync(); // evaluate and render the view
  }, [data]);

  return <div id={htmlId} className="mlAucRocChart" data-test-subj="mlAucRocChart" />;
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default AucRocChartView;
