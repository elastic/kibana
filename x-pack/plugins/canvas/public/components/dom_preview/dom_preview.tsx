/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';

interface Props {
  elementId: string;
  height: number;
}

export class DomPreview extends PureComponent<Props> {
  static propTypes = {
    elementId: PropTypes.string.isRequired,
    height: PropTypes.number.isRequired,
  };

  _container: HTMLDivElement | null = null;
  _content: HTMLDivElement | null = null;
  _observer: MutationObserver | null = null;
  _original: Element | null = null;
  _updateTimeout: number = 0;

  componentDidMount() {
    this.update();
  }

  componentWillUnmount() {
    clearTimeout(this._updateTimeout);

    if (this._observer) {
      this._observer.disconnect(); // observer not guaranteed to exist
    }
  }

  update = () => {
    if (!this._content || !this._container) {
      return;
    }

    const currentOriginal = document.querySelector(`#${this.props.elementId}`);
    const originalChanged = currentOriginal !== this._original;

    if (originalChanged) {
      if (this._observer) {
        this._observer.disconnect();
      }

      this._original = currentOriginal;

      if (this._original) {
        const slowUpdate = debounce(this.update, 100);
        this._observer = new MutationObserver(slowUpdate);
        // configuration of the observer
        const config = { attributes: true, childList: true, subtree: true };
        // pass in the target node, as well as the observer options
        this._observer.observe(this._original, config);
      } else {
        clearTimeout(this._updateTimeout); // to avoid the assumption that we fully control when `update` is called
        this._updateTimeout = window.setTimeout(this.update, 30);
        return;
      }
    }

    if (!this._original) {
      return;
    }

    const thumb = this._original.cloneNode(true) as HTMLDivElement;
    thumb.id += '-thumb';

    const originalStyle = window.getComputedStyle(this._original, null);
    const originalWidth = parseInt(originalStyle.getPropertyValue('width'), 10);
    const originalHeight = parseInt(originalStyle.getPropertyValue('height'), 10);

    const thumbHeight = this.props.height;
    const scale = thumbHeight / originalHeight;
    const thumbWidth = originalWidth * scale;

    if (this._content.firstChild) {
      this._content.removeChild(this._content.firstChild);
    }

    this._content.appendChild(thumb);

    this._content.style.cssText = `transform: scale(${scale}); transform-origin: top left;`;
    this._container.style.cssText = `width: ${thumbWidth}px; height: ${thumbHeight}px;`;

    // Copy canvas data
    const originalCanvas = this._original.querySelectorAll('canvas');
    const thumbCanvas = (thumb as Element).querySelectorAll('canvas');

    // Cloned canvas elements are blank and need to be explicitly redrawn
    if (originalCanvas.length > 0) {
      Array.from(originalCanvas).map((img, i) => {
        const context = thumbCanvas[i].getContext('2d');
        if (context) {
          context.drawImage(img, 0, 0);
        }
      });
    }
  };

  render() {
    return (
      <div
        ref={(container) => {
          this._container = container;
        }}
        className="dom-preview"
      >
        <div
          ref={(content) => {
            this._content = content;
          }}
        />
      </div>
    );
  }
}
