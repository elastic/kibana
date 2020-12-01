/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiPanel, EuiSpacer } from '@elastic/eui';

import { IndexingStatusContent } from './indexing_status_content';
import { IndexingStatusErrors } from './indexing_status_errors';
import { IndexingStatusLogic } from './indexing_status_logic';

import { IIndexingStatus } from '../types';

export interface IIndexingStatusProps extends IIndexingStatus {
  viewLinkPath: string;
  itemId: string;
  getItemDetailPath?(itemId: string): string;
  getStatusPath(itemId: string, activeReindexJobId: number): string;
  onComplete(numDocumentsWithErrors: number): void;
  setGlobalIndexingStatus?(activeReindexJob: IIndexingStatus): void;
}

export const IndexingStatus: React.FC<IIndexingStatusProps> = ({
  itemId,
  activeReindexJobId,
  viewLinkPath,
  getStatusPath,
  onComplete,
}) => {
  const { percentageComplete, numDocumentsWithErrors } = useValues(IndexingStatusLogic);
  const { fetchIndexingStatus } = useActions(IndexingStatusLogic);
  const statusPath = getStatusPath(itemId, activeReindexJobId);

  useEffect(() => {
    fetchIndexingStatus({ statusPath, onComplete });
  }, []);

  return (
    <div className="c-stui-indexing-status-wrapper">
      {percentageComplete < 100 && (
        <EuiPanel paddingSize="l" hasShadow={true}>
          <IndexingStatusContent percentageComplete={percentageComplete} />
        </EuiPanel>
      )}
      {percentageComplete === 100 && numDocumentsWithErrors > 0 && (
        <>
          <EuiSpacer />
          <IndexingStatusErrors viewLinkPath={viewLinkPath} />
        </>
      )}
    </div>
  );
};
