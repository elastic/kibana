/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { elasticOutline } from '../../lib/elastic_outline';
import { isValidUrl } from '../../../common/lib/url';
import { RendererStrings } from '../../../i18n';
import { RendererFactory } from '../../../types';
import { Output as Arguments } from '../../functions/common/revealImage';

const { revealImage: strings } = RendererStrings;

function getClipPath(percent: number, origin = 'bottom') {
  const directions: Record<string, number> = { bottom: 0, left: 1, top: 2, right: 3 };
  const values: Array<number | string> = [0, 0, 0, 0];
  values[directions[origin]] = `${100 - percent * 100}%`;
  return `inset(${values.join(' ')})`;
}

export const revealImage: RendererFactory<Arguments> = () => ({
  name: 'revealImage',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const elementWidth = domNode.clientWidth;
    const elementHeight = domNode.clientHeight;

    const img = new Image();
    img.src = isValidUrl(config.image) ? config.image : elasticOutline;

    const aligner = document.createElement('div');

    const clipPath = getClipPath(config.percent, config.origin);

    const imageAspectRatio = img.naturalHeight / img.naturalWidth;
    const elementAspectRatio = elementHeight / elementWidth;

    const imgStyles = css`
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;

      -webkit-clip-path: ${clipPath};
      clip-path: ${clipPath};
    `;

    const alignerStyles = css`
      background-size: contain;
      background-repeat: no-repeat;
      ${isValidUrl(config.emptyImage) ? `background-image: url(${config.emptyImage});` : ''}
    `;

    const containerStyles = css`
      height: 100%;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    `;

    img.classList.add(imgStyles);
    aligner.classList.add(alignerStyles);
    domNode.classList.add(containerStyles);

    // set up the overlay image
    function onLoad() {
      setSize();
      finish();
    }

    img.onload = onLoad;

    handlers.onResize(onLoad);

    aligner.appendChild(img);

    function finish() {
      const firstChild = domNode.firstChild;
      if (firstChild) {
        domNode.replaceChild(aligner, firstChild);
      } else {
        domNode.appendChild(aligner);
      }
      handlers.done();
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
