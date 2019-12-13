/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import { ExpressionLoader } from '../../../../../src/plugins/expressions/public';
import {
  Embeddable,
  EmbeddableOutput,
  EmbeddableHandlers,
  EmbeddableInput,
} from '../../../../../src/plugins/embeddable/public';

export const EXPRESSION_EMBEDDABLE = 'EXPRESSION_EMBEDDABLE';

export interface ExpressionInput extends EmbeddableInput {
  expression: string;
}

export type ExpressionOutput = EmbeddableOutput;

function getOutput(input: ExpressionInput): ExpressionOutput {
  return {};
}

export class ExpressionEmbeddable extends Embeddable<ExpressionInput, ExpressionOutput> {
  // The type of this embeddable. This will be used to find the appropriate factory
  // to instantiate this kind of embeddable.
  public readonly type = EXPRESSION_EMBEDDABLE;
  private subscriptions: Subscription[] = [];
  private node?: HTMLElement;
  private ExpressionLoaderClass?: typeof ExpressionLoader;
  private handler?: ExpressionLoader;

  constructor(
    initialInput: ExpressionInput,
    {
      ExpressionLoaderClass,
      parent,
      createSearchCollector,
    }: {
      ExpressionLoaderClass: typeof ExpressionLoader;
    } & EmbeddableHandlers
  ) {
    super(initialInput, getOutput(initialInput), { parent, createSearchCollector });

    this.ExpressionLoaderClass = ExpressionLoaderClass;
    // If you have any output state that changes as a result of input state changes, you
    // should use an subcription.  Here, we use output to indicate whether this task
    // matches the search string.
    this.subscriptions.push(
      this.getInput$().subscribe(() => {
        this.updateOutput(getOutput(this.input));
        if (this.handler) {
          this.handler.update(this.input.expression, {
            extraHandlers: { search: this.searchCollector.search, onResize: () => {} },
          });
        }
      })
    );
  }

  public render(node: HTMLElement) {
    this.node = node;
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }

    if (this.ExpressionLoaderClass) {
      this.handler = new this.ExpressionLoaderClass(this.node, this.input.expression, {
        extraHandlers: { search: this.searchCollector.search, onResize: () => {} },
      });
      this.subscriptions.push(this.handler.render$.subscribe(count => {}));
    }
  }

  /**
   * Not relevant.
   */
  public reload() {
    if (this.handler) {
      this.handler.update(this.input.expression, {
        extraHandlers: {
          search: this.searchCollector.search,
          onResize: () => {},
        },
      });
    }
  }

  public destroy() {
    super.destroy();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.handler) {
      this.handler.destroy();
      //    ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
