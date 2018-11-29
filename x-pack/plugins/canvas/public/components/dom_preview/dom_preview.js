/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';

export class DomPreview extends React.Component {
  static container = null;
  static content = null;
  static observer = null;

  static propTypes = {
    elementId: PropTypes.string.isRequired,
    height: PropTypes.number.isRequired,
  };

  componentDidMount() {
    const original = document.querySelector(`#${this.props.elementId}`);

    const update = this.update(original);
    update();

    const slowUpdate = debounce(update, 250);

    this.observer = new MutationObserver(slowUpdate);
    // configuration of the observer
    const config = { attributes: true, childList: true, subtree: true };
    // pass in the target node, as well as the observer options
    this.observer.observe(original, config);
  }

  componentWillUnmount() {
    this.observer.disconnect();
  }

  update = original => () => {
    if (!this.content || !this.container) return;

    const thumb = original.cloneNode(true);

    const originalStyle = window.getComputedStyle(original, null);
    const originalWidth = parseInt(originalStyle.getPropertyValue('width'), 10);
    const originalHeight = parseInt(originalStyle.getPropertyValue('height'), 10);

    const thumbHeight = this.props.height;
    const scale = thumbHeight / originalHeight;
    const thumbWidth = originalWidth * scale;

    if (this.content.hasChildNodes()) this.content.removeChild(this.content.firstChild);
    this.content.appendChild(thumb);

    this.content.style.cssText = `transform: scale(${scale}); transform-origin: top left;`;
    this.container.style.cssText = `width: ${thumbWidth}px; height: ${thumbHeight}px;`;

    // Copy canvas data
    const originalCanvas = original.querySelectorAll('canvas');
    const thumbCanvas = thumb.querySelectorAll('canvas');

    // Cloned canvas elements are blank and need to be explicitly redrawn
    if (originalCanvas.length > 0) {
      Array.from(originalCanvas).map((img, i) =>
        thumbCanvas[i].getContext('2d').drawImage(img, 0, 0)
      );
    }
  };

  render() {
    return (
      <div
        ref={container => {
          this.container = container;
        }}
        className="dom-preview"
      >
        <div
          ref={content => {
            this.content = content;
          }}
        />
      </div>
    );
  }
}
