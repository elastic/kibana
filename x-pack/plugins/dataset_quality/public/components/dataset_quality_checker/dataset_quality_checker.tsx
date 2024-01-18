/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  htmlIdGenerator,
} from '@elastic/eui';
import { useActor } from '@xstate/react';
import React, { useCallback, useMemo, useState } from 'react';
import { CheckTimeRange } from '../../../common';
import { IDataStreamQualityClient } from '../../services/data_stream_quality';
import {
  DataStreamQualityChecksStateProvider,
  useDataStreamQualityChecksStateContext,
} from './state_machine_provider';

export interface DataStreamQualityCheckerProps {
  dataStream: string;
  timeRange: CheckTimeRange;
}

export const createDataStreamQualityChecker = ({
  dataStreamQualityClient,
}: {
  dataStreamQualityClient: IDataStreamQualityClient;
}) =>
  React.memo(({ dataStream, timeRange }: DataStreamQualityCheckerProps) => {
    const [initialParameters] = useState(() => ({
      dataStream,
      timeRange,
    }));

    const [dependencies] = useState(() => ({
      dataStreamQualityClient,
    }));

    const [key, regenerateKey] = useRandomId(
      `${initialParameters.dataStream}-${initialParameters.timeRange.start}-${initialParameters.timeRange.end}`
    );

    return (
      <DataStreamQualityChecksStateProvider
        key={key}
        initialParameters={initialParameters}
        dependencies={dependencies}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => regenerateKey()}>Reload</EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <ConnectedDataStreamQualityCheckerContent />
          </EuiFlexItem>
        </EuiFlexGroup>
      </DataStreamQualityChecksStateProvider>
    );
  });

const ConnectedDataStreamQualityCheckerContent = () => {
  const [state] = useActor(useDataStreamQualityChecksStateContext());

  if (state.matches('planning')) {
    return <EuiLoadingSpinner />;
  } else if (state.matches('planned')) {
    return <ConnectedPlannedChecksList />;
  } else if (state.matches('checking') || state.matches('checked')) {
    return <ConnectedCheckProgressList />;
  }

  return <>Content</>;
};

const ConnectedPlannedChecksList = () => {
  const [state, send] = useActor(useDataStreamQualityChecksStateContext());

  const performChecks = useCallback(() => {
    send({
      type: 'performPlannedChecks',
    });
  }, [send]);

  const checks = state.context.plan?.checks ?? [];

  return (
    <>
      {checks.map(({ check_id: checkId, data_stream: dataStream }) => (
        <EuiPanel key={`${checkId}-${dataStream}`}>{checkId}</EuiPanel>
      ))}
      <EuiButton onClick={performChecks}>Run checks</EuiButton>
    </>
  );
};

const ConnectedCheckProgressList = () => {
  const [state, send] = useActor(useDataStreamQualityChecksStateContext());

  const checkProgress = state.context.checkProgress;

  return (
    <>
      {checkProgress.map(({ check: { check_id: checkId, data_stream: dataStream }, progress }) =>
        progress === 'pending' ? (
          <EuiPanel key={`${checkId}-${dataStream}`}>{checkId}</EuiPanel>
        ) : (
          <EuiPanel key={`${checkId}-${dataStream}`} color="success">
            {checkId}
          </EuiPanel>
        )
      )}
    </>
  );
};

const useRandomId = (prefix: string) => {
  const generateId = useMemo(() => htmlIdGenerator(prefix), [prefix]);
  const [randomId, setRandomId] = useState(generateId);
  const regenerateId = useCallback(() => {
    setRandomId(generateId());
  }, [generateId]);
  return [randomId, regenerateId] as const;
};
