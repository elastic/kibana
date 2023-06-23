/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import ReactDOM from 'react-dom';
import React from 'react';
import { Subscription } from 'rxjs';
import { MonitorListEmbeddableComponent } from './monitor_list_component';

export interface MonitorListInput extends EmbeddableInput {
  search: string;
}

export interface MonitorListOutput extends EmbeddableOutput {
  search: string;
}

export const MONITOR_LIST_EMBEDDABLE = 'MONITOR_LIST_EMBEDDABLE';

function getOutput(input: MonitorListInput): MonitorListOutput {
  return {
    search: input.search,
  };
}

export class MonitorListEmbeddable extends Embeddable<MonitorListInput, MonitorListOutput> {
  // The type of this embeddable. This will be used to find the appropriate factory
  // to instantiate this kind of embeddable.
  public readonly type = MONITOR_LIST_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;

  constructor(initialInput: MonitorListInput, parent?: IContainer) {
    super(initialInput, getOutput(initialInput), parent);

    this.subscription = this.getInput$().subscribe(() => {
      this.updateOutput(getOutput(this.input));
    });
  }

  /**
   * Render yourself at the dom node using whatever framework you like, angular, react, or just plain
   * vanilla js.
   * @param node
   */
  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;
    ReactDOM.render(<MonitorListEmbeddableComponent embeddable={this} />, node);
  }

  /**
   * This is mostly relevant for time based embeddables which need to update data
   * even if EmbeddableInput has not changed at all.
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
