/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
Adapted from @mapbox/tiny-sdf library
TODO: Proper license attribution (e.g. BSD-2-Clause)
*/

const INF = 1e20;

export class Image2SDF {
  size: number;
  buffer: number;
  cutoff: number;
  radius: number;
  private _canvas: HTMLCanvasElement;
  constructor({ size = 64, buffer = 3, cutoff = 0.25, radius = 4 }) {
    this.buffer = buffer;
    this.cutoff = cutoff;
    this.radius = radius;
    this.size = size;
    this._canvas = document.createElement('canvas');
  }

  draw(image: HTMLImageElement) {
    const buffer = this.buffer;
    const cutoff = this.cutoff;
    const radius = this.radius;

    const size = this.size + buffer * 4;
    this._canvas.width = this._canvas.height = size;
    const ctx = this._canvas.getContext('2d')!;
    const gridOuter = new Float64Array(size * size);
    const gridInner = new Float64Array(size * size);
    const f = new Float64Array(size);
    const z = new Float64Array(size + 1);
    const v = new Int16Array(size);

    const glyphWidth = size - buffer;
    const glyphHeight = size - buffer;

    const bufferWidth = glyphWidth + 2 * buffer;
    const bufferHeight = glyphHeight + 2 * buffer;

    const len = bufferWidth * bufferHeight;
    const data = new Uint8ClampedArray(len);
    const glyph = { data, bufferWidth, bufferHeight, glyphWidth, glyphHeight };

    ctx.clearRect(buffer, buffer, glyphWidth, glyphHeight);
    ctx.drawImage(image, buffer, buffer, glyphWidth, glyphHeight);
    const imgData = ctx.getImageData(buffer, buffer, glyphWidth, glyphHeight);

    gridOuter.fill(INF, 0, len);
    gridInner.fill(0, 0, len);

    for (let y = 0; y < glyphHeight; y++) {
      for (let x = 0; x < glyphWidth; x++) {
        const a = imgData.data[4 * (y * glyphWidth + x) + 3] / 255; // alpha value
        if (a === 0) {
          continue;
        }

        const j = (y + buffer) * bufferWidth + x + buffer;

        if (a === 1) {
          // fully drawn pixels
          gridOuter[j] = 0;
          gridInner[j] = INF;
        } else {
          // aliased pixels
          const d = 0.5 - a;
          gridOuter[j] = d > 0 ? d * d : 0;
          gridInner[j] = d < 0 ? d * d : 0;
        }
      }
    }

    edt(gridOuter, bufferWidth, bufferHeight, f, v, z);
    edt(gridInner, bufferWidth, bufferHeight, f, v, z);

    for (let i = 0; i < len; i++) {
      const d = Math.sqrt(gridOuter[i]) - Math.sqrt(gridInner[i]);
      data[i] = Math.round(255 - 255 * (d / radius + cutoff));
    }
    return glyph;
  }
}

// 2D Euclidean squared distance transform by Felzenszwalb & Huttenlocher https://cs.brown.edu/~pff/papers/dt-final.pdf
function edt(
  data: Float64Array,
  width: number,
  height: number,
  f: Float64Array,
  v: Int16Array,
  z: Float64Array
) {
  for (let x = 0; x < width; x++) edt1d(data, x, width, height, f, v, z);
  for (let y = 0; y < height; y++) edt1d(data, y * width, 1, width, f, v, z);
}

// 1D squared distance transform
function edt1d(
  grid: Float64Array,
  offset: number,
  stride: number,
  length: number,
  f: Float64Array,
  v: Int16Array,
  z: Float64Array
) {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  f[0] = grid[offset];

  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);

    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }

  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    const qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}
