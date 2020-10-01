/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import $ from 'jquery';
import { times } from 'lodash';
import { elasticOutline } from '../lib/elastic_outline';
import { isValidUrl } from '../../common/lib/url';
import { RendererStrings, ErrorStrings } from '../../i18n';
import { Return as Arguments } from '../functions/common/repeat_image';
import { RendererFactory } from '../../types';

const { repeatImage: strings } = RendererStrings;
const { RepeatImage: errors } = ErrorStrings;

export const repeatImage: RendererFactory<Arguments> = () => ({
  name: 'repeatImage',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const settings = {
      ...config,
      image: isValidUrl(config.image) ? config.image : elasticOutline,
      emptyImage: config.emptyImage || '',
    };

    const container = $('<div class="repeatImage" style="pointer-events: none;">');

    function setSize(img: HTMLImageElement) {
      if (img.naturalHeight > img.naturalWidth) {
        img.height = settings.size;
      } else {
        img.width = settings.size;
      }
    }

    function finish() {
      $(domNode).append(container);
      handlers.done();
    }

    const img = new Image();
    img.onload = function () {
      setSize(img);
      if (settings.max && settings.count > settings.max) {
        settings.count = settings.max;
      }
      times(settings.count, () => container.append($(img).clone()));

      if (isValidUrl(settings.emptyImage)) {
        if (settings.max == null) {
          throw new Error(errors.getMissingMaxArgumentErrorMessage());
        }

        const emptyImage = new Image();
        emptyImage.onload = function () {
          setSize(emptyImage);
          times(settings.max - settings.count, () => container.append($(emptyImage).clone()));
          finish();
        };
        emptyImage.src = settings.emptyImage;
      } else {
        finish();
      }
    };

    img.src = settings.image;
  },
});
