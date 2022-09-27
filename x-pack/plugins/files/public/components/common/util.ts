/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as bh from 'blurhash';

function isImage(file: File): boolean {
  return file.type?.startsWith('image/');
}

const resizeTo = {
  width: 200,
  height: 200,
};
export async function createBlurhash(file: File): Promise<undefined | string> {
  if (!isImage(file)) return;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(await window.createImageBitmap(file), 0, 0, resizeTo.width, resizeTo.height);
  return bh.encode(
    ctx.getImageData(0, 0, resizeTo.width, resizeTo.height).data,
    resizeTo.width,
    resizeTo.height,
    3,
    3
  );
}

export type BlurhashFactory = typeof createBlurhash;
