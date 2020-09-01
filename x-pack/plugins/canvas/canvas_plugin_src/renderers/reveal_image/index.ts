/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { elasticOutline } from '../../lib/elastic_outline';
import { isValidUrl } from '../../../common/lib/url';
import { RendererStrings } from '../../../i18n';
import { RendererFactory } from '../../../types';
import { Output as Arguments } from '../../functions/common/revealImage';

const { revealImage: strings } = RendererStrings;

export const revealImage: RendererFactory<Arguments> = () => ({
  name: 'revealImage',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const aligner = document.createElement('div');
    const img = new Image();

    // modify the top-level container class
    domNode.className = 'revealImage';

    // set up the overlay image
    function onLoad() {
      setSize();
      finish();
    }
    img.onload = onLoad;

    img.className = 'revealImage__image';
    img.style.clipPath = getClipPath(config.percent, config.origin);
    img.style.setProperty('-webkit-clip-path', getClipPath(config.percent, config.origin));
    img.src = isValidUrl(config.image) ? config.image : elasticOutline;
    handlers.onResize(onLoad);

    // set up the underlay, "empty" image
    aligner.className = 'revealImageAligner';
    aligner.appendChild(img);
    if (isValidUrl(config.emptyImage)) {
      // only use empty image if one is provided
      aligner.style.backgroundImage = `url(${config.emptyImage})`;
    }

    function finish() {
      const firstChild = domNode.firstChild;
      if (firstChild) {
        domNode.replaceChild(aligner, firstChild);
      } else {
        domNode.appendChild(aligner);
      }
      handlers.done();
    }

    function getClipPath(percent: number, origin = 'bottom') {
      const directions: Record<string, number> = { bottom: 0, left: 1, top: 2, right: 3 };
      const values: Array<number | string> = [0, 0, 0, 0];
      values[directions[origin]] = `${100 - percent * 100}%`;
      return `inset(${values.join(' ')})`;
    }

    function setSize() {
      const imgDimensions = {
        height: img.naturalHeight,
        width: img.naturalWidth,
        ratio: img.naturalHeight / img.naturalWidth,
      };

      const domNodeDimensions = {
        height: domNode.clientHeight,
        width: domNode.clientWidth,
        ratio: domNode.clientHeight / domNode.clientWidth,
      };

      if (imgDimensions.ratio > domNodeDimensions.ratio) {
        img.style.height = `${domNodeDimensions.height}px`;
        img.style.width = 'initial';
      } else {
        img.style.width = `${domNodeDimensions.width}px`;
        img.style.height = 'initial';
      }
    }
  },
});
