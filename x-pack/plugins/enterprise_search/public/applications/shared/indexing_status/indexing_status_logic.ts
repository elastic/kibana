/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../flash_messages';
import { HttpLogic } from '../http';
import { IIndexingStatus } from '../schema/types';

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
  path: ['enterprise_search', 'indexing_status_logic'],
  actions: {
    fetchIndexingStatus: ({ statusPath, onComplete }) => ({ statusPath, onComplete }),
    setIndexingStatus: ({ numDocumentsWithErrors, percentageComplete }) => ({
      numDocumentsWithErrors,
      percentageComplete,
    }),
  },
  reducers: ({ props }) => ({
    percentageComplete: [
      props.percentageComplete,
      {
        setIndexingStatus: (_, { percentageComplete }) => percentageComplete,
      },
    ],
    numDocumentsWithErrors: [
      props.numDocumentsWithErrors,
      {
        setIndexingStatus: (_, { numDocumentsWithErrors }) => numDocumentsWithErrors,
      },
    ],
  }),
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
