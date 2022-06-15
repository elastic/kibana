/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FileJSON } from '../../../common/types';
import type { FileKindsRequestHandler } from './types';

interface Response {
  files: FileJSON[];
}

export const handler: FileKindsRequestHandler = async (
  { files: { fileService }, fileKind },
  req,
  res
) => {
  let files: FileJSON[] = [];
  try {
    const response = await fileService.asCurrentUser().list({ fileKind });
    files = response.map((file) => file.toJSON());
  } catch (e) {
    return res.customError({
      statusCode: 500,
      body: {
        message:
          'Something went wrong while update file attributes. Check server logs for more details.',
      },
    });
  }
  const body: Response = {
    files,
  };
  return res.ok({ body });
};
