/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import faker from 'faker';
import { Attachments } from './types';

const files: Attachments = [];

for (let i = 0; i < 15; i++) {
  files.push({
    fileName: faker.system.fileName(),
    fileType: faker.system.fileType(),
    dateAdded: faker.date.past().toString(),
  });
}

export type GetCaseAttachmentsParams = {
  page: number;
  perPage: number;
  extension?: string[];
  mimeType?: string[];
  searchTerm?: string;
};

type GetCaseAttachmentsResponse = {
  pageOfItems: Attachments;
  availableTypes: string[];
  totalItemCount: number;
};

// Manually handle pagination of data
const findFiles = (files: Attachments, pageIndex: number, pageSize: number) => {
  let pageOfItems;

  if (!pageIndex && !pageSize) {
    pageOfItems = files;
  } else {
    const startIndex = pageIndex * pageSize;
    pageOfItems = files.slice(startIndex, Math.min(startIndex + pageSize, files.length));
  }

  return {
    pageOfItems,
    totalItemCount: files.length,
  };
};

export const useGetCaseAttachments = ({
  page,
  perPage,
  extension,
  mimeType,
  searchTerm,
}: GetCaseAttachmentsParams): {
  data: GetCaseAttachmentsResponse;
  isLoading: boolean;
} => {
  const availableTypes = [...new Set(files.map((item) => item.fileType))];

  return {
    data: {
      ...findFiles(files, page, perPage),
      availableTypes,
    },
    isLoading: false,
  };
};
