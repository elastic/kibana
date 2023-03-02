/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * These were retrieved from https://www.iana.org/assignments/media-types/media-types.xhtml#image
 */
const imageMimeTypes = [
  'image/aces',
  'image/apng',
  'image/avci',
  'image/avcs',
  'image/avif',
  'image/bmp',
  'image/cgm',
  'image/dicom-rle',
  'image/dpx',
  'image/emf',
  'image/example',
  'image/fits',
  'image/g3fax',
  'image/heic',
  'image/heic-sequence',
  'image/heif',
  'image/heif-sequence',
  'image/hej2k',
  'image/hsj2',
  'image/jls',
  'image/jp2',
  'image/jpeg',
  'image/jph',
  'image/jphc',
  'image/jpm',
  'image/jpx',
  'image/jxr',
  'image/jxrA',
  'image/jxrS',
  'image/jxs',
  'image/jxsc',
  'image/jxsi',
  'image/jxss',
  'image/ktx',
  'image/ktx2',
  'image/naplps',
  'image/png',
  'image/prs.btif',
  'image/prs.pti',
  'image/pwg-raster',
  'image/svg+xml',
  'image/t38',
  'image/tiff',
  'image/tiff-fx',
  'image/vnd.adobe.photoshop',
  'image/vnd.airzip.accelerator.azv',
  'image/vnd.cns.inf2',
  'image/vnd.dece.graphic',
  'image/vnd.djvu',
  'image/vnd.dwg',
  'image/vnd.dxf',
  'image/vnd.dvb.subtitle',
  'image/vnd.fastbidsheet',
  'image/vnd.fpx',
  'image/vnd.fst',
  'image/vnd.fujixerox.edmics-mmr',
  'image/vnd.fujixerox.edmics-rlc',
  'image/vnd.globalgraphics.pgb',
  'image/vnd.microsoft.icon',
  'image/vnd.mix',
  'image/vnd.ms-modi',
  'image/vnd.mozilla.apng',
  'image/vnd.net-fpx',
  'image/vnd.pco.b16',
  'image/vnd.radiance',
  'image/vnd.sealed.png',
  'image/vnd.sealedmedia.softseal.gif',
  'image/vnd.sealedmedia.softseal.jpg',
  'image/vnd.svf',
  'image/vnd.tencent.tap',
  'image/vnd.valve.source.texture',
  'image/vnd.wap.wbmp',
  'image/vnd.xiff',
  'image/vnd.zbrush.pcx',
  'image/webp',
  'image/wmf',
];

const textMimeTypes = ['text/plain', 'text/csv', 'text/json', 'application/json'];

const compressionMimeTypes = [
  'application/zip',
  'application/gzip',
  'application/x-bzip',
  'application/x-bzip2',
  'application/x-7z-compressed',
  'application/x-tar',
];

const pdfMimeTypes = ['application/pdf'];

export const ALLOWED_MIME_TYPES = [
  ...imageMimeTypes,
  ...textMimeTypes,
  ...compressionMimeTypes,
  ...pdfMimeTypes,
];

export const IMAGE_MIME_TYPES = new Set(imageMimeTypes);
