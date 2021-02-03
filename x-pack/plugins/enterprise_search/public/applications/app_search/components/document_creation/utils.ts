/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const readUploadedFileAsText = (fileInput: File): Promise<string> => {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onload = () => {
      resolve(reader.result as string);
    };
    try {
      reader.readAsText(fileInput);
    } catch {
      reader.abort();
      reject(new Error());
    }
  });
};
