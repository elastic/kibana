/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpLogic } from '../http';
import { IIndexingStatus } from '../types';
import { flashAPIErrors } from '../flash_messages';

interface IndexingStatusProps {
  statusPath: string;
  onComplete(numDocumentsWithErrors: number): void;
}

interface IndexingStatusActions {
  fetchIndexingStatus(props: IndexingStatusProps): IndexingStatusProps;
  setIndexingStatus({
    percentageComplete,
    numDocumentsWithErrors,
  }: IIndexingStatus): IIndexingStatus;
}

interface IndexingStatusValues {
  percentageComplete: number;
  numDocumentsWithErrors: number;
}

let pollingInterval: number;

export const IndexingStatusLogic = kea<MakeLogicType<IndexingStatusValues, IndexingStatusActions>>({
  actions: {
    fetchIndexingStatus: ({ statusPath, onComplete }) => ({ statusPath, onComplete }),
    setIndexingStatus: ({ numDocumentsWithErrors, percentageComplete }) => ({
      numDocumentsWithErrors,
      percentageComplete,
    }),
  },
  reducers: {
    percentageComplete: [
      100,
      {
        setIndexingStatus: (_, { percentageComplete }) => percentageComplete,
      },
    ],
    numDocumentsWithErrors: [
      0,
      {
        setIndexingStatus: (_, { numDocumentsWithErrors }) => numDocumentsWithErrors,
      },
    ],
  },
  listeners: ({ actions }) => ({
    fetchIndexingStatus: ({ statusPath, onComplete }: IndexingStatusProps) => {
      const { http } = HttpLogic.values;

      pollingInterval = window.setInterval(async () => {
        try {
          const response: IIndexingStatus = await http.get(statusPath);
          if (response.percentageComplete >= 100) {
            clearInterval(pollingInterval);
            onComplete(response.numDocumentsWithErrors);
          }
          actions.setIndexingStatus(response);
        } catch (e) {
          flashAPIErrors(e);
        }
      }, 3000);
    },
  }),
  events: () => ({
    beforeUnmount() {
      clearInterval(pollingInterval);
    },
  }),
});
