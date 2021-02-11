/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon } from '@elastic/eui';
import { Ping } from '../../../../common/runtime_types/ping';
import { ExecutedStep } from '../executed_step';

interface Props {
  ping: Ping;
  browserConsole?: string;
  expandedRows: Record<string, JSX.Element>;
  setExpandedRows: (val: Record<string, JSX.Element>) => void;
}

export const toggleExpand = ({
  ping,
  browserConsole = '',
  expandedRows,
  setExpandedRows,
}: Props) => {
  // If already expanded, collapse
  if (expandedRows[ping.docId]) {
    delete expandedRows[ping.docId];
    setExpandedRows({ ...expandedRows });
    return;
  }

  // Otherwise expand this row
  setExpandedRows({
    ...expandedRows,
    [ping.docId]: (
      <ExecutedStep
        step={ping}
        browserConsole={browserConsole}
        index={ping.synthetics?.step!.index!}
      />
    ),
  });
};

export const ExpandRowColumn = ({ ping, browserConsole, expandedRows, setExpandedRows }: Props) => {
  return (
    <EuiButtonIcon
      data-test-subj="uptimeStepListExpandBtn"
      onClick={() => toggleExpand({ ping, browserConsole, expandedRows, setExpandedRows })}
      aria-label={
        expandedRows[ping.docId]
          ? i18n.translate('xpack.uptime.stepList.collapseRow', {
              defaultMessage: 'Collapse',
            })
          : i18n.translate('xpack.uptime.stepList.expandRow', { defaultMessage: 'Expand' })
      }
      iconType={expandedRows[ping.docId] ? 'arrowUp' : 'arrowDown'}
    />
  );
};
