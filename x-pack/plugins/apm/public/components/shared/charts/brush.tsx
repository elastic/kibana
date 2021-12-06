/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';

import { brush, brushSelection, brushX } from 'd3-brush';
import { select } from 'd3-selection';

const d3 = { brush, brushSelection, brushX, select };

import './brush.scss';

interface MlBrush {
  id: number;
  brush: unknown;
}

const margin = {
  top: 10,
  right: 10,
  bottom: 10,
  left: 10,
};

const width = 400 - margin.left - margin.right;
const height = 200 - margin.top - margin.bottom;

export function MlBrush({ data }: { data: any[] }) {
  const d3Container = useRef(null);

  useEffect(() => {
    if (d3Container.current) {
      const svg = d3.select(d3Container.current);

      const gElement = svg
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      gElement
        .append('rect')
        .attr('class', 'grid-background')
        .attr('width', width)
        .attr('height', height);

      // We initially generate a SVG group to keep our brushes' DOM elements in:
      const gBrushes = gElement.append('g').attr('class', 'brushes');

      // We also keep the actual d3-brush functions and their IDs in a list:
      const brushes: MlBrush[] = [];

      function newBrush() {
        brushes.push({
          id: brushes.length,
          brush: d3
            .brushX()
            .on('start', brushstart)
            .on('brush', brushed)
            .on('end', brushend),
        });

        function brushstart() {
          // your stuff here
        }

        function brushed() {
          // your stuff here
        }

        function brushend() {
          // Figure out if our latest brush has a selection
          const lastBrushID = brushes[brushes.length - 1].id;
          const lastBrush = document.getElementById('brush-' + lastBrushID);
          const selection = d3.brushSelection(lastBrush);

          // If it does, that means we need another one
          if (selection && selection[0] !== selection[1]) {
            newBrush();
          }

          // Always draw brushes
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
            // call the brush
            brushObject.brush(d3.select(this));
          });

        mlBrushSelection.each(function (brushObject: MlBrush) {
          d3.select(this)
            .attr('class', 'brush')
            .selectAll('.overlay')
            .style('pointer-events', function () {
              const b = brushObject.brush;
              if (brushObject.id === brushes.length - 1 && b !== undefined) {
                return 'all';
              } else {
                return 'none';
              }
            });
        });

        brushSelection.exit().remove();
      }

      newBrush();
      drawBrushes();
    }
  }, []);

  return (
    <svg
      className="ml-d3-component"
      width={width}
      height={height}
      ref={d3Container}
    />
  );
}
