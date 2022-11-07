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
  ApplicationStart,
  OverlayStart,
  ScopedFilesClient,
  FileImageMetadata,
} from '../imports';
import { ImageEmbeddable, IMAGE_EMBEDDABLE_TYPE } from './image_embeddable';
import { ImageConfig } from '../types';
import { imageEmbeddableFileKind } from '../../common';

export interface ImageEmbeddableFactoryDeps {
  start: () => {
    application: ApplicationStart;
    overlays: OverlayStart;
    files: ScopedFilesClient<FileImageMetadata>;
  };
}

export interface ImageEmbeddableInput extends EmbeddableInput {
  imageConfig: ImageConfig;
}

export class ImageEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<ImageEmbeddableInput>
{
  public readonly type = IMAGE_EMBEDDABLE_TYPE;

  constructor(private deps: ImageEmbeddableFactoryDeps) {}

  public async isEditable() {
    return Boolean(this.deps.start().application.capabilities.dashboard?.showWriteControls);
  }

  public async create(initialInput: ImageEmbeddableInput, parent?: IContainer) {
    return new ImageEmbeddable(
      {
        getImageDownloadHref: (fileId) =>
          this.deps
            .start()
            .files.getDownloadHref({ id: fileId, fileKind: imageEmbeddableFileKind.id }),
      },
      initialInput,
      parent
    );
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

    const imageConfig = await configureImage(
      {
        files: this.deps.start().files,
        overlays: this.deps.start().overlays,
        currentAppId$: this.deps.start().application.currentAppId$,
      },
      initialInput ? initialInput.imageConfig : undefined
    );

    return { imageConfig };
  }
}
