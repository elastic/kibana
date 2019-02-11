/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Embeddable } from 'ui/embeddable';

export class MapEmbeddable extends Embeddable {

  constructor({ onEmbeddableStateChanged, savedMap, editUrl }) {
    super({ title: savedMap.title, editUrl });

    this.onEmbeddableStateChanged = onEmbeddableStateChanged;
    this.savedMap = savedMap;
  }

  /**
   *
   * @param {HTMLElement} domNode
   * @param {ContainerState} containerState
   */
  public render(domNode, containerState) {
    this.timeRange = containerState.timeRange;
    this.query = containerState.query;
    this.filters = containerState.filters;

    render(
      <div>My maps applicaiton</div>,
      domNode
    );
  }

  public destroy() {
    this.savedMap.destroy();
  }

  public reload() {

  }
}
