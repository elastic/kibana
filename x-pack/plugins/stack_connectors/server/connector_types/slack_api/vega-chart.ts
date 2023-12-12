/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { View, parse as parseVegaSpec } from 'vega';
import { compile as vegaLiteCompile } from 'vega-lite';

interface ChartDatum {
  d: string; // date
  v: number; // value
  g: string; // group
}
interface ChartData {
  values: ChartDatum[];
  field: string;
  thresholds: number[];
}

interface ChartDataSplit {
  text: string;
  chartData?: ChartData;
}

type VegaLiteSpec = Record<string, unknown>;

const chartDataRegex = /(.*?)<kibana-chart-data>(.*?)<\/kibana-chart-data>(.*?)/;

export function getChartData(text: string): ChartDataSplit {
  const result: ChartDataSplit = { text };
  const match = text.match(chartDataRegex);

  if (!match) return result;

  result.text = `${match[1]}${match[3]}`;

  try {
    result.chartData = JSON.parse(match[2]) as ChartData;
  } catch (err) {
    console.log('error getting chart data:', err);
  }

  return result;
}

export function generateVegaChartSpec(chartData: ChartData): VegaLiteSpec {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: `Values of ${chartData.field} before alert.`,
    data: { values: chartData.values },
    mark: 'line',
    encoding: {
      x: { field: 'd', type: 'temporal', axis: { title: 'date' } },
      y: { field: 'v', type: 'quantitative', axis: { title: chartData.field } },
      color: { field: 'g', type: 'nominal' },
    },
  };
}

// see: https://observablehq.com/@bmesuere/generating-images-using-vega-lite-and-node
export async function generateChartPngStream(chartSpec: VegaLiteSpec): Promise<ReadableStream> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vegaSpec = vegaLiteCompile(chartSpec as any).spec;
  const view = new View(parseVegaSpec(vegaSpec), { renderer: 'none' });
  const canvas = await view.toCanvas();
  // @ts-ignore
  return canvas.createPNGStream();
}
