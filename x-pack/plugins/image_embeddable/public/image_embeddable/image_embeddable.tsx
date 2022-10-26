/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { i18n } from '@kbn/i18n';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
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

  public render() {
    function ImageEmbeddableViewer(props: { embeddable: ImageEmbeddable }) {
      const input = useObservable(props.embeddable.getInput$(), props.embeddable.getInput());

      return (
        <div data-test-subj="imageEmbeddable" data-render-complete="true">
          Image here! {input.imageSrc}
        </div>
      );
    }

    return <ImageEmbeddableViewer embeddable={this} />;
  }

  public reload() {}
}
