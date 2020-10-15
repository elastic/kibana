/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shapes } from '../../renderers/shape/shapes';
import { ViewStrings } from '../../../i18n';

const { Shape: strings } = ViewStrings;

export const shape = () => ({
  name: 'shape',
  displayName: strings.getDisplayName(),
  modelArgs: [],
  requiresContext: false,
  args: [
    {
      name: '_',
      displayName: strings.getShapeDisplayName(),
      argType: 'shape',
      options: {
        shapes,
      },
    },
    {
      name: 'fill',
      displayName: strings.getFillDisplayName(),
      argType: 'color',
      help: strings.getFillHelp(),
    },
    {
      name: 'border',
      displayName: strings.getBorderDisplayName(),
      argType: 'color',
      help: strings.getBorderHelp(),
    },
    {
      name: 'borderWidth',
      displayName: strings.getBorderWidthDisplayName(),
      argType: 'number',
      help: strings.getBorderWidthHelp(),
    },
    {
      name: 'maintainAspect',
      displayName: strings.getMaintainAspectDisplayName(),
      argType: 'toggle',
      help: strings.getMaintainAspectHelp(),
      options: {
        labelValue: strings.getMaintainAspectLabelName(),
      },
    },
  ],
});
