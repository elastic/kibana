/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiPanel, EuiSpacer } from '@elastic/eui';

import { IndexingStatusContent } from './indexing_status_content';
import { IndexingStatusErrors } from './indexing_status_errors';
import { IndexingStatusFetcher } from './indexing_status_fetcher';

import { IIndexingStatus } from '../types';

export interface IIndexingStatusProps extends IIndexingStatus {
  viewLinkPath: string;
  itemId: string;
  getItemDetailPath?(itemId: string): string;
  getStatusPath(itemId: string, activeReindexJobId: number): string;
  onComplete(numDocumentsWithErrors: number): void;
  setGlobalIndexingStatus?(activeReindexJob: IIndexingStatus): void;
}

export const IndexingStatus: React.FC<IIndexingStatusProps> = (props) => {
  const statusPanel = (percentComplete: number) => (
    <EuiPanel paddingSize="l" hasShadow>
      <IndexingStatusContent percentageComplete={percentComplete} />
    </EuiPanel>
  );

  return (
    <IndexingStatusFetcher {...props}>
      {(percentageComplete, numDocumentsWithErrors) => (
        <div className="c-stui-indexing-status-wrapper">
          {percentageComplete < 100 && statusPanel(percentageComplete)}
          {percentageComplete === 100 && numDocumentsWithErrors > 0 && (
            <>
              <EuiSpacer />
              <IndexingStatusErrors viewLinkPath={props.viewLinkPath} />
            </>
          )}
        </div>
      )}
    </IndexingStatusFetcher>
  );
};
