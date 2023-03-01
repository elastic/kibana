/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexedCase } from '../../../../common/endpoint/data_loaders/index_case';

export const indexNewCase = async (): Promise<IndexedCase> => {
  return new Promise<IndexedCase>((resolve) => {
    cy.task<IndexedCase['data']>('indexCase').then((caseData) => {
      resolve({
        data: caseData,
        cleanup: async (): Promise<void> => {
          cy.log(`Deleting Case data: ${caseData.title} (${caseData.id})`);
          cy.task('deleteIndexedCase', caseData);
        },
      });
    });
  });
};
