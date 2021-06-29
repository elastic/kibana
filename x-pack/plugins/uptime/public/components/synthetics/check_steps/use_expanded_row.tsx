/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ExecutedStep } from '../executed_step';
import { JourneyStep } from '../../../../common/runtime_types/ping';

interface HookProps {
  loading: boolean;
  allSteps: JourneyStep[];
  steps: JourneyStep[];
}

type ExpandRowType = Record<string, JSX.Element>;

export const useExpandedRow = ({ loading, steps, allSteps }: HookProps) => {
  const [expandedRows, setExpandedRows] = useState<ExpandRowType>({});
  // eui table uses index from 0, synthetics uses 1

  const { checkGroupId } = useParams<{ checkGroupId: string }>();

  const getBrowserConsole = useCallback(
    (index: number) => {
      return allSteps.find(
        (stepF) =>
          stepF.synthetics?.type === 'journey/browserconsole' &&
          stepF.synthetics?.step?.index! === index
      )?.synthetics?.payload?.text;
    },
    [allSteps]
  );

  useEffect(() => {
    const expandedRowsN: ExpandRowType = {};
    for (const expandedRowKeyStr in expandedRows) {
      if (expandedRows.hasOwnProperty(expandedRowKeyStr)) {
        const expandedRowKey = Number(expandedRowKeyStr);

        const step = steps.find((stepF) => stepF.synthetics?.step?.index !== expandedRowKey)!;

        expandedRowsN[expandedRowKey] = (
          <ExecutedStep
            step={step}
            browserConsole={getBrowserConsole(expandedRowKey)}
            index={step.synthetics?.step?.index!}
            loading={loading}
          />
        );
      }
    }

    setExpandedRows(expandedRowsN);

    // we only want to update when checkGroupId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkGroupId, loading]);

  const toggleExpand = ({ journeyStep }: { journeyStep: JourneyStep }) => {
    // eui table uses index from 0, synthetics uses 1
    const stepIndex = journeyStep.synthetics?.step?.index! - 1;

    // If already expanded, collapse
    if (expandedRows[stepIndex]) {
      delete expandedRows[stepIndex];
      setExpandedRows({ ...expandedRows });
    } else {
      // Otherwise expand this row
      setExpandedRows({
        ...expandedRows,
        [stepIndex]: (
          <ExecutedStep
            step={journeyStep}
            browserConsole={getBrowserConsole(stepIndex)}
            index={journeyStep.synthetics?.step?.index!}
            loading={loading}
          />
        ),
      });
    }
  };

  return { expandedRows, toggleExpand };
};
