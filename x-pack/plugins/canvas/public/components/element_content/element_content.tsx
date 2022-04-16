/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { omitBy, isNil } from 'lodash';
// @ts-expect-error Untyped library
import Style from 'style-it';

import { ExpressionRenderer } from '@kbn/expressions-plugin';
import { getType } from '@kbn/interpreter';
import { Loading } from '../loading';
import { RenderWithFn } from '../render_with_fn';
// @ts-expect-error Untyped local
import { ElementShareContainer } from '../element_share_container';
import { InvalidExpression } from './invalid_expression';
import { InvalidElementType } from './invalid_element_type';
import { RendererHandlers } from '../../../types';
import { Renderable } from '../../../canvas_plugin_src/functions/common/render';

export interface Props {
  renderable: Renderable | null;
  renderFunction: ExpressionRenderer<any> | null;
  height: number;
  width: number;
  handlers: RendererHandlers;
  backgroundColor: string;
  selectElement: () => void;
  state: string;
}

export const ElementContent = (props: Props) => {
  const { renderable, renderFunction, width, height, handlers, backgroundColor, state } = props;
  const { onComplete } = handlers;

  if (!state || !renderable) {
    return <Loading backgroundColor={backgroundColor} />;
  }

  // renderable is available, but no matching element is found, render invalid
  if (renderable && getType(renderable) !== 'render' && !renderFunction) {
    return <InvalidElementType {...props} renderableType={renderable?.as} />;
  }

  // error state, render invalid expression notice
  if (
    state === 'error' || // The renderable has an error
    getType(renderable) !== 'render' || // The renderable isn't, well, renderable
    !renderFunction // We can't find an element in the registry for this
  ) {
    return <InvalidExpression {...props} />;
  }

  const containerStyle = omitBy(renderable.containerStyle, isNil);

  return Style.it(
    renderable.css,
    <div
      // TODO: 'canvas__element' was added for BWC, It can be removed after a while
      className={'canvas__element canvasElement'}
      style={{ ...containerStyle, width, height }}
      data-test-subj="canvasWorkpadPageElementContent"
    >
      <ElementShareContainer
        className="canvasElement__content"
        onComplete={onComplete}
        functionName={renderFunction.name}
      >
        <RenderWithFn
          name={renderFunction.name}
          renderFn={renderFunction.render}
          reuseNode={renderFunction.reuseDomNode}
          config={renderable.value}
          css={renderable.css} // This is an actual CSS stylesheet string, it will be scoped by RenderElement
          width={width}
          height={height}
          handlers={handlers}
        />
      </ElementShareContainer>
    </div>
  );
};
