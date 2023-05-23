/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiContextMenuItem, EuiEmptyPrompt, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  errorLabel,
  noDataStreamsDescriptionLabel,
  noDataStreamsLabel,
  noDataRetryLabel,
} from '../constants';
import { DataStream } from '../../../../common/data_streams';
import { DataStreamSkeleton } from './data_streams_skeleton';
import { DataStreamSelectionHandler } from '../types';

interface DataStreamListProps {
  dataStreams: DataStream[] | null;
  error: Error | null;
  isLoading: boolean;
  onStreamClick: DataStreamSelectionHandler;
  onRetry: () => void;
}

export const DataStreamsList = ({
  dataStreams,
  error,
  isLoading,
  onStreamClick,
  onRetry,
}: DataStreamListProps) => {
  const isEmpty = dataStreams == null || dataStreams.length <= 0;
  const hasError = error !== null;

  if (isLoading) {
    return <DataStreamSkeleton />;
  }

  if (isEmpty) {
    return (
      <EuiEmptyPrompt
        iconType="search"
        paddingSize="m"
        title={<h2>{noDataStreamsLabel}</h2>}
        titleSize="s"
        body={<p>{noDataStreamsDescriptionLabel}</p>}
      />
    );
  }

  if (hasError) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        iconColor="danger"
        paddingSize="m"
        title={<h2>{noDataStreamsLabel}</h2>}
        titleSize="s"
        body={
          <FormattedMessage
            id="xpack.observabilityLogs.dataStreamSelector.noDataStreamsError"
            defaultMessage="An {error} occurred while getting your data streams. Please retry."
            values={{
              error: (
                <EuiToolTip content={error.message}>
                  <EuiText color="danger">{errorLabel}</EuiText>
                </EuiToolTip>
              ),
            }}
          />
        }
        actions={[<EuiButton onClick={onRetry}>{noDataRetryLabel}</EuiButton>]}
      />
    );
  }

  return (
    <>
      {dataStreams.map((stream) => (
        <EuiContextMenuItem key={stream.name} onClick={() => onStreamClick(stream)}>
          {stream.name}
        </EuiContextMenuItem>
      ))}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default DataStreamsList;
