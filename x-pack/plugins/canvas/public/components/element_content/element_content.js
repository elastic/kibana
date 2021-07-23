/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import Style from 'style-it';
import { getType } from '@kbn/interpreter/common';
import { Loading } from '../loading';
import { RenderWithFn } from '../render_with_fn';
import { ElementShareContainer } from '../element_share_container';
import { InvalidExpression } from './invalid_expression';
import { InvalidElementType } from './invalid_element_type';

// const isLoading = (renderable, state) => !state || !renderable;
const isLoading = (renderable, state) => !state || !renderable;

const isNotValidForRendering = (renderable, renderFunction) =>
  renderable && getType(renderable) !== 'render' && !renderFunction;

const isNotValidExpression = (renderable, renderFunction, state) =>
  state === 'error' || // The renderable has an error
  getType(renderable) !== 'render' || // The renderable isn't, well, renderable
  !renderFunction; // We can't find an element in the registry for this

export const ElementContent = (props) => {
  const { renderable, renderFunction, width, height, handlers, backgroundColor, state } = props;
  const { onComplete } = handlers;

  if (isLoading(renderable, state)) return <Loading backgroundColor={backgroundColor} />;

  // renderable is available, but no matching element is found, render invalid
  if (isNotValidForRendering(renderable, renderFunction)) {
    return <InvalidElementType {...props} renderableType={renderable?.as} />;
  }

  // error state, render invalid expression notice
  if (isNotValidExpression(renderable, renderFunction, state)) {
    return <InvalidExpression {...props} />;
  }

  return Style.it(
    renderable.css,
    <div
      // TODO: 'canvas__element' was added for BWC, It can be removed after a while
      className={'canvas__element canvasElement'}
      style={{ ...renderable.containerStyle, width, height }}
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

ElementContent.propTypes = {
  renderable: PropTypes.shape({
    css: PropTypes.string,
    value: PropTypes.object,
  }),
  renderFunction: PropTypes.shape({
    name: PropTypes.string,
    render: PropTypes.func,
    reuseDomNode: PropTypes.bool,
  }),
  size: PropTypes.object,
  handlers: PropTypes.shape({
    setFilter: PropTypes.func.isRequired,
    getFilter: PropTypes.func.isRequired,
    done: PropTypes.func.isRequired,
    onComplete: PropTypes.func.isRequired, // local, not passed through
  }).isRequired,
  state: PropTypes.string,
  backgroundColor: PropTypes.string,
};
