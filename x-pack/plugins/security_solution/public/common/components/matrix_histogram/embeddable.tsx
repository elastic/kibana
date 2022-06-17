/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import {
  Embeddable,
  EmbeddableInput,
  IContainer,
  EmbeddableOutput,
} from '@kbn/embeddable-plugin/public';
import { MatrixHistogram } from '.';

export const MATRIX_HISTOGRAM_EMBEDDABLE = 'MATRIX_HISTOGRAM_EMBEDDABLE';

export interface MatrixHistogramInput extends EmbeddableInput {
  task: string;
  icon?: string;
  search?: string;
}

export interface MatrixHistogramOutput extends EmbeddableOutput {
  hasMatch: boolean;
}

function getOutput(input: MatrixHistogramInput): MatrixHistogramOutput {
  return {
    hasMatch: input.search
      ? Boolean(input.task.match(input.search) || (input.title && input.title.match(input.search)))
      : true,
  };
}

export class MatrixHistogramEmbeddable extends Embeddable<
  MatrixHistogramInput,
  MatrixHistogramOutput
> {
  // The type of this embeddable. This will be used to find the appropriate factory
  // to instantiate this kind of embeddable.
  public readonly type = MATRIX_HISTOGRAM_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;

  constructor(initialInput: MatrixHistogramInput, parent?: IContainer) {
    super(initialInput, getOutput(initialInput), parent);

    // If you have any output state that changes as a result of input state changes, you
    // should use an subcription.  Here, we use output to indicate whether this task
    // matches the search string.
    this.subscription = this.getInput$().subscribe(() => {
      this.updateOutput(getOutput(this.input));
    });
  }

  public render(node: HTMLElement) {
    this.node = node;
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    ReactDOM.render(<MatrixHistogramEmbeddableComponent embeddable={this} />, node);
  }

  /**
   * Not relevant.
   */
  public reload() {}

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
