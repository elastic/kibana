/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useState, FC } from 'react';

// There is still an issue with Vega Lite's typings with the strict mode Kibana is using.
import type { TopLevelSpec } from 'vega-lite';

import { htmlIdGenerator } from '@elastic/eui';

import type { GetVegaSharedImports } from '../../../../../../../src/plugins/vis_type_vega/public';

export interface VegaChartViewProps {
  vegaSpec: TopLevelSpec;
}

export const VegaChartView: FC<VegaChartViewProps> = ({ vegaSpec }) => {
  const htmlId = useMemo(() => htmlIdGenerator()(), []);

  const [vega, setVega] = useState<GetVegaSharedImports>();

  useEffect(() => {
    async function initializeVega() {
      const { getVegaSharedImports } = await import(
        '../../../../../../../src/plugins/vis_type_vega/public'
      );
      setVega(await getVegaSharedImports());
    }

    initializeVega();
  }, []);

  useEffect(() => {
    if (typeof vega === 'undefined') {
      return;
    }

    const { compile, parse, View, Warn, Handler } = vega;

    const vgSpec = compile(vegaSpec).spec;

    const view = new View(parse(vgSpec))
      .logLevel(Warn)
      .renderer('canvas')
      .tooltip(new Handler().call)
      .initialize(`#${htmlId}`);

    view.runAsync(); // evaluate and render the view
  }, [vega, vegaSpec]);

  return <div id={htmlId} className="mlVegaChart" data-test-subj="mlVegaChart" />;
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default VegaChartView;
