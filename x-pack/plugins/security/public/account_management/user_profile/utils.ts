/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const IMAGE_FILE_TYPES = ['image/svg+xml', 'image/jpeg', 'image/png', 'image/gif'];
export const MAX_IMAGE_SIZE = 64;

export function readFile(data: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(data);
  });
}

export function resizeImage(imageUrl: string, maxSize: number) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (image.width <= maxSize && image.height <= maxSize) {
        return resolve(imageUrl);
      }

      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          if (image.width >= image.height) {
            canvas.width = maxSize;
            canvas.height = Math.floor((image.height * maxSize) / image.width);
          } else {
            canvas.height = maxSize;
            canvas.width = Math.floor((image.width * maxSize) / image.height);
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const resizedDataUrl = canvas.toDataURL();
          return resolve(resizedDataUrl);
        }
      } catch (error) {
        return reject(error);
      }

      return reject();
    };
    image.onerror = reject;
    image.src = imageUrl;
  });
}

export function createImageHandler(callback: (imageUrl: string | undefined) => void) {
  return async (files: FileList | null) => {
    if (!files || !files.length) {
      callback(undefined);
      return;
    }
    const file = files[0];
    if (IMAGE_FILE_TYPES.indexOf(file.type) !== -1) {
      const imageUrl = await readFile(file);
      const resizedImageUrl = await resizeImage(imageUrl, MAX_IMAGE_SIZE);
      callback(resizedImageUrl);
    }
  };
}

/**
 * Returns the hex representation of a random color (e.g `#F1B7E2`)
 */
export function getRandomColor() {
  return '#' + String(Math.floor(Math.random() * 0xffffff).toString(16)).padStart(6, '0');
}

export const VALID_HEX_COLOR = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
