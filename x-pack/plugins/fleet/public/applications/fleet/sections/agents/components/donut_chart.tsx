/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef } from 'react';
import d3 from 'd3';
import { EuiFlexItem } from '@elastic/eui';

interface DonutChartProps {
  data: {
    [key: string]: number;
  };
  height: number;
  width: number;
}

export const DonutChart = ({ height, width, data }: DonutChartProps) => {
  const chartElement = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (chartElement.current !== null) {
      // we must remove any existing paths before painting
      d3.selectAll('g').remove();
      const svgElement = d3
        .select(chartElement.current)
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);
      const color = d3.scale
        .ordinal()
        // @ts-ignore
        .domain(data)
        .range(['#017D73', '#98A2B3', '#BD271E', '#F5A700']);
      const pieGenerator = d3.layout
        .pie()
        .value(({ value }: any) => value)
        // these start/end angles will reverse the direction of the pie,
        // which matches our design
        .startAngle(2 * Math.PI)
        .endAngle(0);

      svgElement
        .selectAll('g')
        // @ts-ignore
        .data(pieGenerator(d3.entries(data)))
        .enter()
        .append('path')
        .attr(
          'd',
          // @ts-ignore attr does not expect a param of type Arc<Arc> but it behaves as desired
          d3.svg
            .arc()
            .innerRadius(width * 0.36)
            .outerRadius(Math.min(width, height) / 2)
        )
        .attr('fill', (d: any) => color(d.data.key) as any);
    }
  }, [data, height, width]);
  return (
    <EuiFlexItem grow={false}>
      <svg ref={chartElement} width={width} height={height} />
    </EuiFlexItem>
  );
};
