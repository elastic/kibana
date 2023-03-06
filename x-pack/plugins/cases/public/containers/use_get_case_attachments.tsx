/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import faker from 'faker';
import type { Attachments } from './types';

const fakeFiles: Attachments = [];

for (let i = 0; i < 15; i++) {
  fakeFiles.push({
    fileName: faker.system.fileName(),
    fileType: faker.system.fileType(),
    dateAdded: faker.date.past().toString(),
  });
}

export interface GetCaseAttachmentsParams {
  page: number;
  perPage: number;
  extension?: string[];
  mimeType?: string[];
  searchTerm?: string;
}

interface GetCaseAttachmentsResponse {
  pageOfItems: Attachments;
  availableTypes: string[];
  totalItemCount: number;
}

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
  const availableTypes = [...new Set(fakeFiles.map((item) => item.fileType))];

  return {
    data: {
      ...findFiles(fakeFiles, page, perPage),
      availableTypes,
    },
    isLoading: false,
  };
};
