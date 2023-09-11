/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Embeddable, EmbeddableInput, IContainer } from '@kbn/embeddable-plugin/public';

export const SLO_EMBEDDABLE = 'SLO_EMBEDDABLE';

export class SLOEmbeddable extends Embeddable {
  // The type of this embeddable. This will be used to find the appropriate factory
  // to instantiate this kind of embeddable.
  public readonly type = SLO_EMBEDDABLE;

  constructor(initialInput: EmbeddableInput, parent?: IContainer) {
    super(
      // Input state is irrelevant to this embeddable, just pass it along.
      initialInput,
      // Initial output state - this embeddable does not do anything with output, so just
      // pass along an empty object.
      {},
      // Optional parent component, this embeddable can optionally be rendered inside a container.
      parent
    );
  }

  /**
   * Render yourself at the dom node using whatever framework you like, angular, react, or just plain
   * vanilla js.
   * @param node
   */
  public render(node: HTMLElement) {
    const input = this.getInput();
    console.log(input, '!!input');
    ReactDOM.render(
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="sloList">
        <EuiFlexItem grow>{input.name}</EuiFlexItem>
      </EuiFlexGroup>,
      node
    );
  }

  /**
   * This is mostly relevant for time based embeddables which need to update data
   * even if EmbeddableInput has not changed at all.
   */
  public reload() {}
}
