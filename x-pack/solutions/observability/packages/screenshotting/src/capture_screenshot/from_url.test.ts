/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { captureScreenshotFromUrl } from './from_url';
import * as utils from './utils';
import domtoimage from 'dom-to-image-more';

jest.mock('dom-to-image-more', () => ({
  toCanvas: jest.fn(),
}));

const mockCanvas = {
  toDataURL: jest.fn(() => 'data:image/png;base64,abc123'),
};

describe('captureScreenshotFromUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(utils, 'getSelectorForUrl').mockReturnValue('.kbnAppWrapper');
    jest.spyOn(utils, 'waitForSelector').mockResolvedValue({} as HTMLElement);
    jest.spyOn(utils, 'waitForNoGlobalLoadingIndicator').mockResolvedValue(undefined);
    jest.spyOn(utils, 'canvasToBlob').mockResolvedValue(new Blob(['test'], { type: 'image/png' }));
    (domtoimage.toCanvas as jest.Mock).mockResolvedValue(mockCanvas);

    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'iframe') {
        const iframe = document.createElementNS(
          'http://www.w3.org/1999/xhtml',
          'iframe'
        ) as HTMLIFrameElement;
        setTimeout(() => {
          if (iframe.onload) iframe.onload(new Event('load'));
        }, 0);
        return iframe;
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.querySelectorAll('iframe').forEach((iframe) => iframe.remove());
  });

  it('returns image and blob when successful', async () => {
    const result = await captureScreenshotFromUrl('http://localhost/test');
    expect(result).not.toBeNull();
    expect(result?.image).toBe('data:image/png;base64,abc123');
    expect(result?.blob).toBeInstanceOf(Blob);
    expect(utils.getSelectorForUrl).toHaveBeenCalledWith('http://localhost/test');
    expect(utils.waitForSelector).toHaveBeenCalled();
    expect(utils.waitForNoGlobalLoadingIndicator).toHaveBeenCalled();
    expect(utils.canvasToBlob).toHaveBeenCalledWith(mockCanvas);
  });

  it('returns null if element is not found', async () => {
    (utils.waitForSelector as jest.Mock).mockResolvedValueOnce(null);
    const result = await captureScreenshotFromUrl('http://localhost/test');
    expect(result).toBeNull();
  });

  it('returns null if domtoimage.toCanvas throws', async () => {
    (domtoimage.toCanvas as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const result = await captureScreenshotFromUrl('http://localhost/test');
    expect(result).toBeNull();
  });

  it('appends disableIntersection param to url', async () => {
    let createdIframe: HTMLIFrameElement | null = null;

    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'iframe') {
        createdIframe = document.createElementNS(
          'http://www.w3.org/1999/xhtml',
          'iframe'
        ) as HTMLIFrameElement;
        setTimeout(() => {
          if (createdIframe && createdIframe.onload) createdIframe.onload(new Event('load'));
        }, 0);
        return createdIframe;
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
    });

    await captureScreenshotFromUrl('http://localhost/test?foo=bar');

    expect(createdIframe).not.toBeNull();
    expect(createdIframe!.src).toContain('disableIntersection=true');
  });

  it('cleans up the iframe after completion', async () => {
    await captureScreenshotFromUrl('http://localhost/test');
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeNull();
  });

  it('passes options to waitForNoGlobalLoadingIndicator', async () => {
    await captureScreenshotFromUrl('http://localhost/test', { timeout: 90000, stableFor: 2000 });
    expect(utils.waitForNoGlobalLoadingIndicator).toHaveBeenCalledWith(
      expect.anything(),
      90000 * 2,
      2000
    );
  });
});
