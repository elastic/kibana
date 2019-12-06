/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EmbeddableInput,
  IContainer,
  Embeddable,
} from '../../../../../../src/plugins/embeddable/public';

export class ResolverEmbeddable extends Embeddable {
  public readonly type = 'resolver';
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

  public render(node: HTMLElement) {
    node.innerHTML = '<div data-test-subj="resolverEmbeddable">Welcome from Resolver</div>';
  }

  public reload(): void {
    throw new Error('Method not implemented.');
  }
}
