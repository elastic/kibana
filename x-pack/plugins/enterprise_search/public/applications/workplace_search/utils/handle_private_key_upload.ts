/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readUploadedFileAsText } from './read_uploaded_file_as_text';

export const handlePrivateKeyUpload = async (
  files: FileList | null,
  callback: (text: string) => void
) => {
  if (!files || files.length < 1) {
    return null;
  }
  const file = files[0];
  const text = await readUploadedFileAsText(file);

  callback(text);
};
