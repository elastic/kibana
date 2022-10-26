/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { i18n } from '@kbn/i18n';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import { ImageEmbeddableInput } from './image_embeddable_factory';

export const IMAGE_EMBEDDABLE_TYPE = 'IMAGE_EMBEDDABLE';

export class ImageEmbeddable extends Embeddable<ImageEmbeddableInput> {
  public readonly type = IMAGE_EMBEDDABLE_TYPE;

  constructor(initialInput: ImageEmbeddableInput, parent?: IContainer) {
    super(
      initialInput,
      {
        editable: true,
        editableWithExplicitInput: true,
      },
      parent
    );
  }

  private node: HTMLElement | undefined;
  public render(node: HTMLElement) {
    this.node = node;
    // eslint-disable-next-line no-unsanitized/property
    node.innerHTML = `<div data-test-subj="helloWorldEmbeddable" data-render-complete="true">Image here! ${this.input.imageSrc} </div>`;
  }

  public reload() {}
}
