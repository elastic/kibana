/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, useRef } from 'react';

import { Motion, spring } from 'react-motion';

import { HttpLogic } from '../http';
import { flashAPIErrors } from '../flash_messages';

interface IIndexingStatusFetcherProps {
  activeReindexJobId: number;
  itemId: string;
  percentageComplete: number;
  numDocumentsWithErrors: number;
  onComplete?(numDocumentsWithErrors: number): void;
  getStatusPath(itemId: string, activeReindexJobId: number): string;
  children(percentageComplete: number, numDocumentsWithErrors: number): JSX.Element;
}

interface IIndexingStatus {
  numDocumentsWithErrors: number;
  percentageComplete: number;
}

interface IMotionStatusProps {
  defaultStatus: IIndexingStatus;
  currentStatus: IIndexingStatus;
  children(percentageComplete: number, numDocumentsWithErrors: number): JSX.Element;
}

const MotionStatus: React.FC<IMotionStatusProps> = ({ defaultStatus, currentStatus, children }) => (
  <Motion
    defaultStyle={{
      percentageComplete: defaultStatus.percentageComplete,
    }}
    style={{
      percentageComplete: spring(currentStatus.percentageComplete),
      numDocumentsWithErrors: currentStatus.numDocumentsWithErrors,
    }}
  >
    {({ percentageComplete, numDocumentsWithErrors }) =>
      children(percentageComplete, numDocumentsWithErrors)
    }
  </Motion>
);

export const IndexingStatusFetcher: React.FC<IIndexingStatusFetcherProps> = ({
  activeReindexJobId,
  children,
  getStatusPath,
  itemId,
  numDocumentsWithErrors,
  onComplete,
  percentageComplete = 0,
}) => {
  const [indexingStatus, setIndexingStatus] = useState({
    numDocumentsWithErrors,
    percentageComplete,
  });
  const pollingInterval = useRef<number>();

  useEffect(() => {
    pollingInterval.current = window.setInterval(async () => {
      try {
        const response = await HttpLogic.values.http.get(getStatusPath(itemId, activeReindexJobId));
        if (response.percentageComplete >= 100) {
          clearInterval(pollingInterval.current);
        }
        setIndexingStatus({
          percentageComplete: response.percentageComplete,
          numDocumentsWithErrors: response.numDocumentsWithErrors,
        });
        if (response.percentageComplete >= 100 && onComplete) {
          onComplete(response.numDocumentsWithErrors);
        }
      } catch (e) {
        flashAPIErrors(e);
      }
    }, 3000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  return (
    <MotionStatus
      currentStatus={indexingStatus}
      defaultStatus={{ percentageComplete, numDocumentsWithErrors }}
      children={children}
    />
  );
};
