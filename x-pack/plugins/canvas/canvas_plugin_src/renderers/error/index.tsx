/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React, { MouseEventHandler } from 'react';
import { EuiIcon } from '@elastic/eui';
import { Error } from '../../../public/components/error';
import { Popover } from '../../../public/components/popover';
import { RendererStrings } from '../../../i18n';
import { RendererFactory } from '../../../types';

interface Config {
  error: Error;
}

const { error: strings } = RendererStrings;

export const error: RendererFactory<Config> = () => ({
  name: 'error',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const draw = () => {
      const buttonSize = Math.min(domNode.clientHeight, domNode.clientWidth);
      const button = (handleClick: MouseEventHandler<any>) => (
        <EuiIcon
          className="canvasRenderError__icon"
          onClick={handleClick}
          style={{
            height: buttonSize,
            width: buttonSize,
          }}
          type="alert"
        />
      );

      ReactDOM.render(
        <div className="canvasRenderError">
          <Popover button={button}>{() => <Error payload={config} />}</Popover>
        </div>,

        domNode,
        () => handlers.done()
      );
    };

    draw();

    handlers.onResize(draw);

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
