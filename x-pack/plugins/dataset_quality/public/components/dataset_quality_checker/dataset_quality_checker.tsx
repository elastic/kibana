/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  htmlIdGenerator,
} from '@elastic/eui';
import { useActor } from '@xstate/react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  CheckPlanStep,
  CheckTimeRange,
  DataStreamQualityCheckExecution,
  QualityProblem,
} from '../../../common';
import { IDataStreamQualityClient } from '../../services/data_stream_quality';
import { DetailsPreJson, PreJson } from './json_details';
import { ConnectedMitigations } from './mitigation_wizard';
import {
  DataStreamQualityChecksStateProvider,
  useDataStreamQualityChecksStateContext,
} from './state_machine_provider';
import { StepPanel, Steps } from './step_panel';

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
  } else if (state.matches('mitigatingProblem')) {
    return <ConnectedMitigations />;
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
    <Steps>
      {checks.map((check) => (
        <StepPanel
          key={`${check.check_id}-${check.data_stream}`}
          title={`Planned check ${check.check_id}`}
          color="primary"
        >
          <CheckPlanStepFields check={check} />
          <EuiSpacer />
          <DetailsPreJson title="check details" value={check} />
        </StepPanel>
      ))}
      <EuiFlexItem grow={false}>
        <EuiButton onClick={performChecks}>Run checks</EuiButton>
      </EuiFlexItem>
    </Steps>
  );
};

const ConnectedCheckProgressList = () => {
  const [state, send] = useActor(useDataStreamQualityChecksStateContext());

  const checkProgress = state.context.checkProgress;

  const mitigateProblem = useCallback(
    (check: CheckPlanStep, problem: QualityProblem) =>
      send({
        type: 'mitigateProblem',
        check,
        problem,
      }),
    [send]
  );

  return (
    <Steps>
      {checkProgress.map((check) =>
        check.progress === 'pending' ? (
          <CheckListPendingItem
            key={`${check.check.check_id}-${check.check.data_stream}`}
            check={check.check}
          />
        ) : (
          <CheckListFinishedItem
            key={`${check.check.check_id}-${check.check.data_stream}`}
            check={check.check}
            execution={check.execution}
            onMitigateProblem={mitigateProblem}
          />
        )
      )}
    </Steps>
  );
};

const CheckListPendingItem = ({ check }: { check: CheckPlanStep }) => (
  <StepPanel title={`Pending check ${check.check_id}`} color="warning">
    <CheckPlanStepFields check={check} />
  </StepPanel>
);

const CheckListFinishedItem = ({
  check,
  execution,
  onMitigateProblem,
}: {
  check: CheckPlanStep;
  execution: DataStreamQualityCheckExecution;
  onMitigateProblem: (check: CheckPlanStep, problem: QualityProblem) => void;
}) => {
  if (execution.result.type === 'skipped') {
    return (
      <StepPanel title={`Skipped check ${check.check_id}`} color="warning">
        <CheckPlanStepFields check={check} />
        <DetailsPreJson title={`Check details`} value={check} />
        <DetailsPreJson title={`Result details`} value={execution} />
      </StepPanel>
    );
  } else if (execution.result.type === 'passed') {
    return (
      <StepPanel title={`Passed check ${check.check_id}`} color="success">
        <CheckPlanStepFields check={check} />
        <DetailsPreJson title={`Check details`} value={check} />
        <DetailsPreJson title={`Result details`} value={execution} />
      </StepPanel>
    );
  } else if (execution.result.type === 'failed') {
    return (
      <StepPanel title={`Failed check ${check.check_id}`} color="danger">
        <CheckPlanStepFields check={check} />
        <EuiSpacer />
        <EuiTitle size="xs">
          <h2>Reasons</h2>
        </EuiTitle>
        <EuiFlexGroup direction="column" gutterSize="s">
          {execution.result.reasons.map((problem, problemIndex) => {
            return (
              <EuiFlexItem key={problemIndex}>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiFlexGroup direction="row" alignItems="center">
                    <EuiFlexItem>
                      {problem.type === 'ignored-field'
                        ? `Ignored field ${problem.field_name} in ${problem.document_count} documents `
                        : problem.type}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButton color="primary" onClick={() => onMitigateProblem(check, problem)}>
                        Fix this problem
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
        <EuiSpacer />
        <DetailsPreJson title={`Check: ${check.check_id}`} value={check} />
        <DetailsPreJson title={`Result: ${execution.result.type}`} value={execution} />
      </StepPanel>
    );
  }

  return (
    <StepPanel color="accent">
      <PreJson value={check} />
      <PreJson value={execution} />
    </StepPanel>
  );
};

const CheckPlanStepFields = React.memo(({ check }: { check: CheckPlanStep }) => (
  <EuiDescriptionList
    type="column"
    listItems={[
      {
        title: 'Data stream',
        description: check.data_stream,
      },
      {
        title: 'Start',
        description: check.time_range.start,
      },
      {
        title: 'End',
        description: check.time_range.end,
      },
    ]}
  />
));

const useRandomId = (prefix: string) => {
  const generateId = useMemo(() => htmlIdGenerator(prefix), [prefix]);
  const [randomId, setRandomId] = useState(generateId);
  const regenerateId = useCallback(() => {
    setRandomId(generateId());
  }, [generateId]);
  return [randomId, regenerateId] as const;
};
