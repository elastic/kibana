/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'bluebird';

import { screenshotStitcher } from './index';

const fsp = {
  readFile: promisify(fs.readFile)
};

const readPngFixture = async (filename) => {
  const buffer = await fsp.readFile(path.join(__dirname, 'fixtures', filename));
  return buffer.toString('base64');
};

const getSingleWhitePixel = () => {
  return readPngFixture('single-white-pixel.png');
};

const getSingleBlackPixel = () => {
  return readPngFixture('single-black-pixel.png');
};

const get2x1Checkerboard = () => {
  return readPngFixture('2x1-checkerboard.png');
};

const get2x2White = () => {
  return readPngFixture('2x2-white.png');
};

const get2x2Black = () => {
  return readPngFixture('2x2-black.png');
};

const get4x4Checkerboard = () => {
  return readPngFixture('4x4-checkerboard.png');
};

test(`single screenshot`, async () => {
  const clip = {
    x: 0,
    y: 0,
    height: 1,
    width: 1,
  };

  const fn = jest.fn();
  fn.mockReturnValueOnce(getSingleWhitePixel());
  const data = await screenshotStitcher(clip, 1, 1, fn);

  expect(fn.mock.calls.length).toBe(1);
  expect(fn.mock.calls[0][0]).toEqual({ x: 0, y: 0, width: 1, height: 1 });

  const expectedData = await getSingleWhitePixel();
  expect(data).toEqual(expectedData);
});

test(`single screenshot, when zoom creates partial pixel we round up`, async () => {
  const clip = {
    x: 0,
    y: 0,
    height: 1,
    width: 1,
  };

  const fn = jest.fn();
  fn.mockReturnValueOnce(get2x2White());
  const data = await screenshotStitcher(clip, 2, 1, fn);

  expect(fn.mock.calls.length).toBe(1);
  expect(fn.mock.calls[0][0]).toEqual({ x: 0, y: 0, width: 1, height: 1 });

  const expectedData = await get2x2White();
  expect(data).toEqual(expectedData);
});

test(`two screenshots, no zoom`, async () => {
  const clip = {
    x: 0,
    y: 0,
    height: 1,
    width: 2,
  };

  const fn = jest.fn();
  fn.mockReturnValueOnce(getSingleWhitePixel());
  fn.mockReturnValueOnce(getSingleBlackPixel());
  const data = await screenshotStitcher(clip, 1, 1, fn);

  expect(fn.mock.calls.length).toBe(2);
  expect(fn.mock.calls[0][0]).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  expect(fn.mock.calls[1][0]).toEqual({ x: 1, y: 0, width: 1, height: 1 });

  const expectedData = await get2x1Checkerboard();
  expect(data).toEqual(expectedData);
});

test(`four screenshots, zoom`, async () => {
  const clip = {
    x: 0,
    y: 0,
    height: 2,
    width: 2,
  };

  const fn = jest.fn();
  fn.mockReturnValueOnce(get2x2White());
  fn.mockReturnValueOnce(get2x2Black());
  fn.mockReturnValueOnce(get2x2Black());
  fn.mockReturnValueOnce(get2x2White());

  const data = await screenshotStitcher(clip, 2, 1, fn);

  expect(fn.mock.calls.length).toBe(4);
  expect(fn.mock.calls[0][0]).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  expect(fn.mock.calls[1][0]).toEqual({ x: 1, y: 0, width: 1, height: 1 });
  expect(fn.mock.calls[2][0]).toEqual({ x: 0, y: 1, width: 1, height: 1 });
  expect(fn.mock.calls[3][0]).toEqual({ x: 1, y: 1, width: 1, height: 1 });

  const expectedData = await get4x4Checkerboard();
  expect(data).toEqual(expectedData);
});


test(`four screenshots, zoom and offset`, async () => {
  const clip = {
    x: 1,
    y: 1,
    height: 2,
    width: 2,
  };

  const fn = jest.fn();
  fn.mockReturnValueOnce(get2x2White());
  fn.mockReturnValueOnce(get2x2Black());
  fn.mockReturnValueOnce(get2x2Black());
  fn.mockReturnValueOnce(get2x2White());

  const data = await screenshotStitcher(clip, 2, 1, fn);

  expect(fn.mock.calls.length).toBe(4);
  expect(fn.mock.calls[0][0]).toEqual({ x: 1, y: 1, width: 1, height: 1 });
  expect(fn.mock.calls[1][0]).toEqual({ x: 2, y: 1, width: 1, height: 1 });
  expect(fn.mock.calls[2][0]).toEqual({ x: 1, y: 2, width: 1, height: 1 });
  expect(fn.mock.calls[3][0]).toEqual({ x: 2, y: 2, width: 1, height: 1 });

  const expectedData = await get4x4Checkerboard();
  expect(data).toEqual(expectedData);
});
