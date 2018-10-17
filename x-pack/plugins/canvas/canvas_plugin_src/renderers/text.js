/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { i18n } from '@kbn/i18n';

export const text = () => ({
  name: 'text',
  displayName: i18n.translate('xpack.canvas.renderers.textDisplayName', {
    defaultMessage: 'Plain text',
  }),
  help: i18n.translate('xpack.canvas.renderers.textHelpText', {
    defaultMessage: 'Render output as plain text',
  }),
  reuseDomNode: true,
  render(domNode, { text }, handlers) {
    ReactDOM.render(<div>{text}</div>, domNode, () => handlers.done());
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
