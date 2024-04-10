/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, type FC } from 'react';

import * as d3Brush from 'd3-brush';
import * as d3Scale from 'd3-scale';
import * as d3Selection from 'd3-selection';
import * as d3Transition from 'd3-transition';
import { useEuiTheme } from '@elastic/eui';

// TODO Consolidate with similar component `DualBrush` in
// x-pack/packages/ml/aiops_components/src/dual_brush/dual_brush.tsx

const { brush, brushSelection, brushX } = d3Brush;
const { scaleLinear } = d3Scale;
const { select: d3Select } = d3Selection;
// Import fix to apply correct types for the use of d3.select(this).transition()
d3Select.prototype.transition = d3Transition.transition;

export const getSingleBrushWindowParameters = (
  clickTime: number,
  minTime: number,
  maxTime: number
): SingleBrushWindowParameters => {
  // Workout ideal bounds for the brush when user clicks on the chart
  const totalWindow = maxTime - minTime;

  // min brush window
  const minDeviationWindow = 10 * 60 * 1000; // 10min

  // work out bounds as done in the original notebooks,
  // with the brush window aiming to be a 1/10
  // of the size of the total window and the baseline window
  // being 3.5/10 of the total window.
  const brushWindow = Math.max(totalWindow / 10, minDeviationWindow);

  const brushMin = clickTime - brushWindow / 2;
  const brushMax = clickTime + brushWindow / 2;

  return {
    min: Math.round(brushMin),
    max: Math.round(brushMax),
  };
};
export const getSnappedSingleBrushWindowParameters = (
  windowParameters: SingleBrushWindowParameters,
  snapTimestamps: number[]
): SingleBrushWindowParameters => {
  const snappedBaselineMin = snapTimestamps.reduce((pts, cts) => {
    if (Math.abs(cts - windowParameters.min) < Math.abs(pts - windowParameters.min)) {
      return cts;
    }
    return pts;
  }, snapTimestamps[0]);
  const baselineMaxTimestamps = snapTimestamps.filter((ts) => ts > snappedBaselineMin);

  const snappedBaselineMax = baselineMaxTimestamps.reduce((pts, cts) => {
    if (Math.abs(cts - windowParameters.max) < Math.abs(pts - windowParameters.max)) {
      return cts;
    }
    return pts;
  }, baselineMaxTimestamps[0]);

  return {
    min: snappedBaselineMin,
    max: snappedBaselineMax,
  };
};

export interface SingleBrushWindowParameters {
  /** Time range minimum value */
  min: number;
  /** Time range maximum value */
  max: number;
}

const d3 = {
  brush,
  brushSelection,
  brushX,
  scaleLinear,
  select: d3Select,
  transition: d3Transition,
};

const isBrushXSelection = (arg: unknown): arg is [number, number] => {
  return (
    Array.isArray(arg) &&
    arg.length === 2 &&
    typeof arg[0] === 'number' &&
    typeof arg[1] === 'number'
  );
};

interface SingleBrush {
  id: string;
  brush: d3Brush.BrushBehavior<SingleBrush>;
  start: number;
  end: number;
}

const BRUSH_HEIGHT = 20;
const BRUSH_MARGIN = 4;
const BRUSH_HANDLE_SIZE = 4;
const BRUSH_HANDLE_ROUNDED_CORNER = 2;

/**
 * Props for the SingleBrush React Component
 */
interface SingleBrushProps {
  /**
   * Unique id for the brush, as it's possible to have multiple instances
   */

  id?: string;
  /**
   * Min and max numeric timestamps for the two brushes
   */
  windowParameters: SingleBrushWindowParameters;
  /**
   * Min timestamp for x domain
   */
  min: number;
  /**
   * Max timestamp for x domain
   */
  max: number;
  /**
   * Callback function whenever the brush changes
   */
  onChange?: (
    windowParameters: SingleBrushWindowParameters,
    windowPxParameters: SingleBrushWindowParameters
  ) => void;
  /**
   * Margin left
   */
  marginLeft: number;
  /**
   * Nearest timestamps to snap to the brushes to
   */
  snapTimestamps?: number[];
  /**
   * Width
   */
  width: number;
}

/**
 * SingleBrush React Component
 * Single brush component that overlays the document count chart
 *
 * @param props SingleBrushProps component props
 * @returns The SingleBrush component.
 */
export const SingleBrush: FC<SingleBrushProps> = (props) => {
  const {
    id: brushId = '',
    windowParameters,
    min,
    max,
    onChange,
    marginLeft,
    snapTimestamps,
    width,
  } = props;
  const d3BrushContainer = useRef(null);
  const brushes = useRef<SingleBrush[]>([]);

  // We need to pass props to refs here because the d3-brush code doesn't consider
  // native React prop changes. The brush code does its own check whether these props changed then.
  // The initialized brushes might otherwise act on stale data.
  const widthRef = useRef(width);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const snapTimestampsRef = useRef(snapTimestamps);

  const { min: baselineMin, max: baselineMax } = windowParameters;
  const { euiTheme } = useEuiTheme();
  const handleFillColor = euiTheme.colors.darkShade;

  useEffect(() => {
    if (d3BrushContainer.current && width > 0) {
      const gBrushes = d3.select(d3BrushContainer.current);

      function newBrush(id: string, start: number, end: number) {
        brushes.current.push({
          id,
          brush: d3.brushX<SingleBrush>().handleSize(BRUSH_HANDLE_SIZE).on('end', brushend),
          start,
          end,
        });

        function brushend(this: d3Selection.BaseType) {
          const currentWidth = widthRef.current;

          const x = d3
            .scaleLinear()
            .domain([minRef.current, maxRef.current])
            .rangeRound([0, currentWidth]);

          const px2ts = (px: number) => Math.round(x.invert(px));
          const xMin = x(minRef.current) ?? 0;
          const xMax = x(maxRef.current) ?? 0;
          const minExtentPx = Math.round((xMax - xMin) / 100);

          const baselineBrush = d3.select(`#data-drift-${brushId}`);
          const baselineSelection = d3.brushSelection(baselineBrush.node() as SVGGElement);

          if (!isBrushXSelection(baselineSelection)) {
            return;
          }

          const newWindowParameters = {
            min: px2ts(baselineSelection[0]),
            max: px2ts(baselineSelection[1]),
          };

          if (id === `${brushId}` && baselineSelection) {
            const newBaselineMax = baselineSelection[1];
            const newBaselineMin = Math.min(baselineSelection[0], newBaselineMax - minExtentPx);
            newWindowParameters.min = px2ts(newBaselineMin);
            newWindowParameters.max = px2ts(newBaselineMax);
          }

          const snappedWindowParameters = snapTimestampsRef.current
            ? getSnappedSingleBrushWindowParameters(newWindowParameters, snapTimestampsRef.current)
            : newWindowParameters;

          const newBrushPx = {
            min: x(snappedWindowParameters.min) ?? 0,
            max: x(snappedWindowParameters.max) ?? 0,
          };

          if (
            id === `${brushId}` &&
            (baselineSelection[0] !== newBrushPx.min || baselineSelection[1] !== newBrushPx.max)
          ) {
            d3.select(this)
              .transition()
              .duration(200)
              // @ts-expect-error call doesn't allow the brush move function
              .call(brushes.current[0].brush.move, [newBrushPx.min, newBrushPx.max]);
          }

          brushes.current[0].start = snappedWindowParameters.min;
          brushes.current[0].end = snappedWindowParameters.max;

          if (onChange) {
            onChange(
              {
                min: snappedWindowParameters.min,
                max: snappedWindowParameters.max,
              },
              { min: newBrushPx.min, max: newBrushPx.max }
            );
          }
          drawBrushes();
        }
      }

      function drawBrushes() {
        const mlBrushSelection = gBrushes
          .selectAll('.brush')
          .data<SingleBrush>(brushes.current, (d) => (d as SingleBrush).id);

        // Set up new brushes
        mlBrushSelection
          .enter()
          .insert('g', '.brush')
          .attr('class', 'brush')
          .attr('id', (b: SingleBrush) => {
            return 'data-drift-' + b.id;
          })
          .attr('data-test-subj', (b: SingleBrush) => {
            return 'dataDriftBrush-' + b.id.charAt(0).toUpperCase() + b.id.slice(1);
          })
          .each((brushObject: SingleBrush, i, n) => {
            const x = d3.scaleLinear().domain([min, max]).rangeRound([0, widthRef.current]);
            // Ensure brush style is applied
            brushObject.brush.extent([
              [0, BRUSH_MARGIN],
              [widthRef.current, BRUSH_HEIGHT - BRUSH_MARGIN],
            ]);

            brushObject.brush(d3.select(n[i]));
            const xStart = x(brushObject.start) ?? 0;
            const xEnd = x(brushObject.end) ?? 0;
            brushObject.brush.move(d3.select(n[i]), [xStart, xEnd]);
          });

        // disable drag-select to reset a brush's selection
        mlBrushSelection
          .attr('class', 'brush')
          .selectAll('.overlay')
          .attr('width', widthRef.current)
          .style('pointer-events', 'none');

        mlBrushSelection
          .selectAll('.handle')
          .attr('fill', handleFillColor)
          .attr('rx', BRUSH_HANDLE_ROUNDED_CORNER)
          .attr('ry', BRUSH_HANDLE_ROUNDED_CORNER);

        mlBrushSelection.exit().remove();
      }

      if (brushes.current.length !== 1) {
        widthRef.current = width;
        newBrush(`${brushId}`, baselineMin, baselineMax);
      }

      drawBrushes();
    }
  }, [
    min,
    max,
    width,
    baselineMin,
    baselineMax,
    snapTimestamps,
    onChange,
    brushId,
    handleFillColor,
  ]);

  return (
    <>
      {width > 0 && (
        <svg
          className="data-drift-brush"
          data-test-subj="dataDriftBrush"
          width={width}
          height={BRUSH_HEIGHT}
          style={{ marginLeft }}
        >
          <g className="brushes" width={width} ref={d3BrushContainer} />
        </svg>
      )}
    </>
  );
};
