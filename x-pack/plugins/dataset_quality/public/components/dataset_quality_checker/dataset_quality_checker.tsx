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
import { CheckPlanStep, CheckTimeRange, DataStreamQualityCheckExecution } from '../../../common';
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
    const initialParameters = useMemo(
      () => ({
        dataStream,
        timeRange,
      }),
      [dataStream, timeRange]
    );

    const dependencies = useMemo(
      () => ({
        dataStreamQualityClient,
      }),
      []
    );

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
    <EuiFlexGroup direction="column">
      {checks.map((check) => (
        <EuiFlexItem key={`${check.check_id}-${check.data_stream}`} grow={false}>
          <EuiPanel>
            <PreJson value={check} />
          </EuiPanel>
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiButton onClick={performChecks}>Run checks</EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ConnectedCheckProgressList = () => {
  const [state] = useActor(useDataStreamQualityChecksStateContext());

  const checkProgress = state.context.checkProgress;

  return (
    <EuiFlexGroup direction="column">
      {checkProgress.map((check) => (
        <EuiFlexItem key={`${check.check.check_id}-${check.check.data_stream}`} grow={false}>
          {check.progress === 'pending' ? (
            <CheckListPendingItem check={check.check} />
          ) : (
            <CheckListFinishedItem check={check.check} execution={check.execution} />
          )}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

const CheckListPendingItem = ({ check }: { check: CheckPlanStep }) => (
  <EuiPanel>
    <pre>{JSON.stringify(check, null, 2)}</pre>
  </EuiPanel>
);

const CheckListFinishedItem = ({
  check,
  execution,
}: {
  check: CheckPlanStep;
  execution: DataStreamQualityCheckExecution;
}) => {
  if (execution.result.type === 'skipped') {
    return (
      <EuiPanel color="warning">
        <PreJson value={check} />
        <PreJson value={execution} />
      </EuiPanel>
    );
  } else if (execution.result.type === 'passed') {
    return (
      <EuiPanel color="success">
        <PreJson value={check} />
        <PreJson value={execution} />
      </EuiPanel>
    );
  } else if (execution.result.type === 'failed') {
    return (
      <EuiPanel color="danger">
        <PreJson value={check} />
        <PreJson value={execution} />
        <EuiButton color="danger">Fix this problem</EuiButton>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel color="accent">
      <PreJson value={check} />
      <PreJson value={execution} />
    </EuiPanel>
  );
};

const PreJson = ({ value }: { value: unknown }) => <pre>{JSON.stringify(value, null, 2)}</pre>;

const useRandomId = (prefix: string) => {
  const generateId = useMemo(() => htmlIdGenerator(prefix), [prefix]);
  const [randomId, setRandomId] = useState(generateId);
  const regenerateId = useCallback(() => {
    setRandomId(generateId());
  }, [generateId]);
  return [randomId, regenerateId] as const;
};
