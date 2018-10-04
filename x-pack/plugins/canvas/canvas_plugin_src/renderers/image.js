/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { elasticLogo } from '../lib/elastic_logo';
import { isValid } from '../../common/lib/url';

export const image = () => ({
  name: 'image',
  displayName: i18n.translate('xpack.canvas.renderers.imageDisplayName', {
    defaultMessage: 'Image',
  }),
  help: i18n.translate('xpack.canvas.renderers.imageHelpText', {
    defaultMessage: 'Render an image',
  }),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const dataurl = isValid(config.dataurl) ? config.dataurl : elasticLogo;

    const style = {
      height: '100%',
      backgroundImage: `url(${dataurl})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      backgroundSize: config.mode,
    };

    ReactDOM.render(<div style={style} />, domNode, () => handlers.done());

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
