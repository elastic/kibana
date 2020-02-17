/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// !!!! Should be deleted when https://github.com/elastic/endpoint-app-team/issues/150
// is implemented

const dateOffsets = [
  0,
  1000,
  300000, // 5 minutes
  3.6e6, // 1 hour
  86340000, // 23h, 59m
  9e7, // 25h
  9e7 * 5, // 5d
];

const randomNumbers = [5, 50, 500, 5000, 50000];

const getRandomDateIsoString = () => {
  const randomIndex = Math.floor(Math.random() * Math.floor(dateOffsets.length));
  return new Date(Date.now() - dateOffsets[randomIndex]).toISOString();
};

const getRandomNumber = () => {
  const randomIndex = Math.floor(Math.random() * Math.floor(randomNumbers.length));
  return randomNumbers[randomIndex];
};

export const getFakeDatasourceApiResponse = async (page: number, pageSize: number) => {
  await new Promise(resolve => setTimeout(resolve, 500));

  // Emulates the API response - see PR:
  // https://github.com/elastic/kibana/pull/56567/files#diff-431549a8739efe0c56763f164c32caeeR25
  return {
    items: Array.from({ length: pageSize }, (x, i) => ({
      name: `policy with some protections  ${i + 1}`,
      total: getRandomNumber(),
      pending: getRandomNumber(),
      failed: getRandomNumber(),
      created_by: `admin ABC`,
      created: getRandomDateIsoString(),
      updated_by: 'admin 123',
      updated: getRandomDateIsoString(),
    })),
    success: true,
    total: pageSize * 10,
    page,
    perPage: pageSize,
  };
};
