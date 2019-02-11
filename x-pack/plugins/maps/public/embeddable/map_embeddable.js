/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Embeddable } from 'ui/embeddable';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

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
  render(domNode, containerState) {
    this.domNode = domNode;
    this.timeRange = containerState.timeRange;
    this.query = containerState.query;
    this.filters = containerState.filters;

    render(
      <div>My maps applicaiton</div>,
      domNode
    );
  }

  destroy() {
    this.savedMap.destroy();
    if (this.domNode) {
      unmountComponentAtNode(this.domNode);
    }
  }

  reload() {

  }
}
