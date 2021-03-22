/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiPanel, EuiSpacer } from '@elastic/eui';

import { IIndexingStatus } from '../types';

import { IndexingStatusContent } from './indexing_status_content';
import { IndexingStatusErrors } from './indexing_status_errors';
import { IndexingStatusLogic } from './indexing_status_logic';

export interface IIndexingStatusProps {
  viewLinkPath: string;
  itemId: string;
  statusPath: string;
  getItemDetailPath?(itemId: string): string;
  onComplete(numDocumentsWithErrors: number): void;
  setGlobalIndexingStatus?(activeReindexJob: IIndexingStatus): void;
}

export const IndexingStatus: React.FC<IIndexingStatusProps> = ({
  viewLinkPath,
  statusPath,
  onComplete,
}) => {
  const { percentageComplete, numDocumentsWithErrors } = useValues(IndexingStatusLogic);
  const { fetchIndexingStatus } = useActions(IndexingStatusLogic);

  useEffect(() => {
    fetchIndexingStatus({ statusPath, onComplete });
  }, []);

  return (
    <>
      {percentageComplete < 100 && (
        <EuiPanel paddingSize="l" hasShadow>
          <IndexingStatusContent percentageComplete={percentageComplete} />
        </EuiPanel>
      )}
      {percentageComplete === 100 && numDocumentsWithErrors > 0 && (
        <>
          <EuiSpacer />
          <IndexingStatusErrors viewLinkPath={viewLinkPath} />
        </>
      )}
    </>
  );
};
