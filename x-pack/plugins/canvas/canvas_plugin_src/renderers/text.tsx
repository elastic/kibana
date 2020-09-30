/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { RendererStrings } from '../../i18n';
import { RendererFactory } from '../../types';

const { text: strings } = RendererStrings;

export const text: RendererFactory<{ text: string }> = () => ({
  name: 'text',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, { text: textString }, handlers) {
    ReactDOM.render(<div>{textString}</div>, domNode, () => handlers.done());
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
