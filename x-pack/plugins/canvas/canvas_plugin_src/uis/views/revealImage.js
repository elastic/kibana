/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ViewStrings } from '../../../i18n';

const { RevealImage: strings } = ViewStrings;

export const revealImage = () => ({
  name: 'revealImage',
  displayName: strings.getDisplayName(),
  modelArgs: [['_', { label: 'Value' }]],
  args: [
    {
      name: 'image',
      displayName: strings.getImageDisplayName(),
      help: strings.getImageHelp(),
      argType: 'imageUpload',
    },
    {
      name: 'emptyImage',
      displayName: strings.getEmptyImageDisplayName(),
      help: strings.getEmptyImageHelp(),
      argType: 'imageUpload',
    },
    {
      name: 'origin',
      displayName: strings.getOriginDisplayName(),
      help: strings.getOriginHelp(),
      argType: 'select',
      options: {
        choices: [
          { value: 'top', name: strings.getOriginTop() },
          { value: 'left', name: strings.getOriginLeft() },
          { value: 'bottom', name: strings.getOriginBottom() },
          { value: 'right', name: strings.getOriginRight() },
        ],
      },
    },
  ],
});
