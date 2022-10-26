/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
} from '@kbn/embeddable-plugin/public';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { ImageEmbeddable, IMAGE_EMBEDDABLE_TYPE } from './image_embeddable';

export interface ImageEmbeddableFactoryDeps {
  start: StartServicesGetter;
}

export interface ImageEmbeddableInput extends EmbeddableInput {
  imageSrc: string;
}

export class ImageEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<ImageEmbeddableInput>
{
  public readonly type = IMAGE_EMBEDDABLE_TYPE;

  constructor(private deps: ImageEmbeddableFactoryDeps) {}

  public async isEditable() {
    return Boolean(this.deps.start().core.application.capabilities.dashboard?.showWriteControls);
  }

  public async create(initialInput: ImageEmbeddableInput, parent?: IContainer) {
    return new ImageEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('xpack.imageEmbeddable.imageEmbeddableFactory.displayName', {
      defaultMessage: 'Image',
    });
  }

  public getIconType() {
    return `image`;
  }

  public async getExplicitInput(initialInput: ImageEmbeddableInput) {
    const { configureImage } = await import('../image_editor');

    const image = await configureImage(
      {
        overlays: this.deps.start().core.overlays,
        currentAppId$: this.deps.start().core.application.currentAppId$,
      },
      initialInput ? { src: initialInput.imageSrc } : undefined
    );

    return { imageSrc: image.imageConfig.src };
  }
}
