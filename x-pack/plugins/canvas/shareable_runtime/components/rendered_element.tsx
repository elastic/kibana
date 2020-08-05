/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, PureComponent } from 'react';
// @ts-expect-error untyped library
import Style from 'style-it';
import { Positionable } from '../../public/components/positionable/positionable';
// @ts-expect-error untyped local
import { elementToShape } from '../../public/components/workpad_page/utils';
import { CanvasRenderedElement } from '../types';
import { CanvasShareableContext, useCanvasShareableState } from '../context';
import { RendererSpec } from '../../types';
import { createHandlers } from '../../public/lib/create_handlers';

import css from './rendered_element.module.scss';

export interface Props {
  /**
   * An object describing the transient, independently renderable Element.
   */
  element: CanvasRenderedElement;

  /**
   * The index of the Element relative to other Elements on the Page. This is
   * primarily used for z-indexing.
   */
  index: number;

  /**
   * The Expression function that evaluates the state of the Element and renders
   * it to the Page.
   */
  fn: RendererSpec;
}

/**
 * A Rendered Element is different from an Element added to a Canvas Workpad.  A
 * Rendered Element has actually be evaluated already to gather any data from
 * datasources, and is just a simple expression to render the result.  This
 * component renders that "transient" element state.
 */
export class RenderedElementComponent extends PureComponent<Props> {
  static contextType = CanvasShareableContext;
  protected ref: React.RefObject<HTMLDivElement>;

  constructor(props: Props) {
    super(props);
    this.ref = React.createRef();
  }

  componentDidMount() {
    const { element, fn } = this.props;
    const { expressionRenderable } = element;
    const { value } = expressionRenderable;
    const { as } = value;

    if (!this.ref.current) {
      return null;
    }

    try {
      fn.render(this.ref.current, value.value, createHandlers());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(as, e.message);
    }
  }

  render() {
    const { element, index } = this.props;
    const shape = elementToShape(element, index || 1);
    const { id, expressionRenderable, position } = element;
    const { value } = expressionRenderable;
    const { as, css: elementCSS, containerStyle } = value;
    const { height, width } = position;

    return (
      <Positionable height={height} width={width} transformMatrix={shape.transformMatrix}>
        <div className={css.root}>
          {Style.it(
            elementCSS,
            <div className={css.container} style={{ ...containerStyle }}>
              <div className={css.content}>
                <div className={css.renderContainer}>
                  <div key={id} ref={this.ref} data-renderer={as} className={css.render} />
                </div>
              </div>
            </div>
          )}
        </div>
      </Positionable>
    );
  }
}

/**
 * A store-connected container for the `RenderedElement` component.
 */
export const RenderedElement: FC<Pick<Props, 'element' | 'index'>> = ({ index, element }) => {
  const [{ renderers }] = useCanvasShareableState();

  const { expressionRenderable } = element;
  const { value } = expressionRenderable;
  const { as } = value;
  const fn = renderers[as];

  return <RenderedElementComponent {...{ element, fn, index }} />;
};
