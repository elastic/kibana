/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { RendererStrings } from '../../../i18n';
import { RendererFactory } from '../../../types';
import { Output } from '../../functions/common/shape';

const { flow: strings } = RendererStrings;

export const flow: RendererFactory<Output> = () => ({
  name: 'flow',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const { /* shape: shapeType, */ fill, border, borderWidth } = config;

    const draw = () => {
      const width = domNode.offsetWidth;
      const height = domNode.offsetHeight;

      const tWidth = 16;
      const tHeight = 16;

      ReactDOM.render(
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ strokeWidth: borderWidth, stroke: border }}
        >
          <rect x={0} y={0} width={width} height={height} style={{ fill }} />
          <rect x={0} y={0} width={tWidth} height={tHeight} fill="rgb(84, 179, 153)" />
          <rect x={width - tWidth} y={0} width={tWidth} height={tHeight} fill="rgb(96, 146, 192)" />
        </svg>,
        domNode
      );
    };

    draw();
    handlers.done();
    handlers.onResize(draw); // debouncing avoided for fluidity
  },
});
