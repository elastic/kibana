/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExecutedStep } from '../executed_step';
import { Ping } from '../../../../common/runtime_types/ping';

interface HookProps {
  allPings: Ping[];
  steps: Ping[];
}

type ExpandRowType = Record<string, JSX.Element>;

export const useExpandedRow = ({ steps, allPings }: HookProps) => {
  const [expandedRows, setExpandedRows] = useState<ExpandRowType>({});
  // eui table uses index from 0, synthetics uses 1

  const { checkGroupId } = useParams<{ checkGroupId: string }>();

  const getBrowserConsole = (index: number) => {
    return allPings.find(
      (stepF) =>
        stepF.synthetics?.type === 'journey/browserconsole' &&
        stepF.synthetics?.step?.index! === index
    )?.synthetics?.payload?.text;
  };

  useEffect(() => {
    const expandedRowsN: ExpandRowType = {};
    for (let expandedRowKeyStr in expandedRows) {
      const expandedRowKey = Number(expandedRowKeyStr);

      const step = steps.find((stepF) => stepF.synthetics?.step?.index !== expandedRowKey)!;

      expandedRowsN[expandedRowKey] = (
        <ExecutedStep
          step={step}
          browserConsole={getBrowserConsole(expandedRowKey)}
          index={step.synthetics?.step?.index!}
        />
      );
    }

    setExpandedRows(expandedRowsN);
  }, [checkGroupId, allPings]);

  const toggleExpand = ({ ping }: { ping: Ping }) => {
    // eui table uses index from 0, synthetics uses 1
    const stepIndex = ping.synthetics?.step?.index! - 1;

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
            step={ping}
            browserConsole={getBrowserConsole(stepIndex)}
            index={ping.synthetics?.step?.index!}
          />
        ),
      });
    }
  };

  return { expandedRows, toggleExpand };
};
