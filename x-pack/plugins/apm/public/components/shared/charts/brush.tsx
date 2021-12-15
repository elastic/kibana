/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { brush, brushSelection, brushX } from 'd3-brush';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import { WindowParameters } from '../../../../common/correlations/change_point/types';

import './brush.scss';

const d3 = { brush, brushSelection, brushX, scaleLinear, select };

interface MlBrush {
  id: string;
  brush: unknown;
  start: number;
  end: number;
}

interface Dimensions {
  width: number;
  height: number;
  margin: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  boundedWidth: number;
  boundedHeight: number;
}

const margin = {
  top: 10,
  right: 30,
  bottom: 10,
  left: 60,
};

// const width = 400 - margin.left - margin.right;
const height = 40 - margin.top - margin.bottom;

export function MlBrush({
  windowParameters,
  min,
  max,
  onChange,
}: {
  windowParameters: WindowParameters;
  min: number;
  max: number;
  onChange?: (windowParameters: WindowParameters) => {};
}) {
  const stageSvgRef = useRef(null);
  const d3Container = useRef(null);

  const width =
    stageSvgRef.current !== null
      ? stageSvgRef.current.clientWidth - margin.left - margin.right
      : null;

  const { baselineMin, baselineMax, deviationMin, deviationMax } =
    windowParameters;

  useEffect(() => {
    if (d3Container.current && stageSvgRef.current && width) {
      const x = d3.scaleLinear().domain([min, max]).rangeRound([0, width]);
      const px2ts = (px: number) => Math.round(x.invert(px));
      const minExtentPx = Math.round((x(max) - x(min)) / 100);
      const brushes: MlBrush[] = [];

      const svg = d3.select(d3Container.current);

      const gElement = svg.append('g');
      // .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      gElement
        .append('rect')
        .attr('class', 'grid-background')
        .attr('width', width)
        .attr('height', height);

      const gBrushes = gElement.append('g').attr('class', 'brushes');

      function newBrush(id: string, start: number, end: number) {
        brushes.push({
          id,
          brush: d3
            .brushX()
            .on('start', brushstart)
            .on('brush', brushed)
            .on('end', brushend),
          start,
          end,
        });

        function brushstart() {
          // your stuff here
        }

        function brushed() {
          // your stuff here
        }

        function brushend() {
          const baselineBrush = document.getElementById('brush-baseline');
          const baselineSelection = d3.brushSelection(baselineBrush);

          const deviationBrush = document.getElementById('brush-deviation');
          const deviationSelection = d3.brushSelection(deviationBrush);

          if (!deviationSelection || !baselineSelection) {
            return;
          }

          const newWindowParameters = {
            baselineMin: px2ts(baselineSelection[0]),
            baselineMax: px2ts(baselineSelection[1]),
            deviationMin: px2ts(deviationSelection[0]),
            deviationMax: px2ts(deviationSelection[1]),
          };

          if (
            id === 'deviation' &&
            deviationSelection &&
            baselineSelection &&
            deviationSelection[0] - minExtentPx < baselineSelection[1]
          ) {
            const newDeviationMin = baselineSelection[1] + minExtentPx;
            const newDeviationMax = Math.max(
              deviationSelection[1],
              newDeviationMin + minExtentPx
            );

            newWindowParameters.deviationMin = px2ts(newDeviationMin);
            newWindowParameters.deviationMax = px2ts(newDeviationMax);

            d3.select(this)
              .transition()
              .duration(200)
              .call(brushes[1].brush.move, [newDeviationMin, newDeviationMax]);
          } else if (
            id === 'baseline' &&
            deviationSelection &&
            baselineSelection &&
            deviationSelection[0] < baselineSelection[1] + minExtentPx
          ) {
            const newBaselineMax = deviationSelection[0] - minExtentPx;
            const newBaselineMin = Math.min(
              baselineSelection[0],
              newBaselineMax - minExtentPx
            );

            newWindowParameters.baselineMin = px2ts(newBaselineMin);
            newWindowParameters.baselineMax = px2ts(newBaselineMax);

            d3.select(this)
              .transition()
              .duration(200)
              .call(brushes[0].brush.move, [newBaselineMin, newBaselineMax]);
          }

          if (onChange) {
            onChange(newWindowParameters);
          }
          drawBrushes();
        }
      }

      function drawBrushes() {
        const mlBrushSelection = gBrushes
          .selectAll('.brush')
          .data(brushes, function (d: MlBrush) {
            return d.id;
          });

        // Set up new brushes
        mlBrushSelection
          .enter()
          .insert('g', '.brush')
          .attr('class', 'brush')
          .attr('id', function (b: MlBrush) {
            return 'brush-' + b.id;
          })
          .each(function (brushObject: MlBrush) {
            brushObject.brush(d3.select(this));
            brushObject.brush.move(d3.select(this), [
              x(brushObject.start),
              x(brushObject.end),
            ]);
          });

        // disable drag-select to reset a brush's selection
        mlBrushSelection
          .attr('class', 'brush')
          .selectAll('.overlay')
          .style('pointer-events', 'none');

        mlBrushSelection.exit().remove();
      }

      newBrush('baseline', baselineMin, baselineMax);
      newBrush('deviation', deviationMin, deviationMax);
      drawBrushes();
    }
  }, [
    min,
    max,
    width,
    baselineMin,
    baselineMax,
    deviationMin,
    deviationMax,
    // onChange,
  ]);

  return (
    <div className="ml-state-svg" ref={stageSvgRef}>
      {width && (
        <svg
          className="ml-d3-component"
          width={width}
          height={height + 5}
          ref={d3Container}
        />
      )}
    </div>
  );
}
