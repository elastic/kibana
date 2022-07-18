/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';

import { EuiBasicTable } from '@elastic/eui';

import { FunctionContext } from './contexts/function';

function getCalleeFunction(frame: StackFrameMetadata): string {
  // In the best case scenario, we have the file names, source lines,
  // and function names. However we need to deal with missing function or
  // executable info.
  const exeDisplayName = frame.ExeFileName ? frame.ExeFileName : frame.FrameTypeString;

  // When there is no function name, only use the executable name
  return frame.FunctionName ? exeDisplayName + ': ' + frame.FunctionName : exeDisplayName;
}

function getCalleeSource(frame: StackFrameMetadata): string {
  if (frame.FunctionName === '' && frame.SourceLine === 0) {
    if (frame.ExeFileName) {
      // If no source line or filename available, display the executable offset
      return frame.ExeFileName + '+0x' + frame.AddressOrLine.toString(16);
    }

    // If we don't have the executable filename, display <unsymbolized>
    return '<unsymbolized>';
  }

  if (frame.SourceFilename !== '' && frame.SourceLine === 0) {
    return frame.SourceFilename;
  }

  return frame.SourceFilename + (frame.FunctionOffset !== 0 ? `#${frame.FunctionOffset}` : '');
}

interface Row {
  rank: number;
  frame: StackFrameMetadata;
  samples: number;
  exclusiveCPU: number;
  inclusiveCPU: number;
}

export const TopNFunctionsTable = () => {
  const ctx = useContext(FunctionContext);

  const rows: Row[] = useMemo(() => {
    if (!ctx || !ctx.TotalCount || ctx.TotalCount === 0) {
      return [];
    }

    return ctx.TopN.filter((topN) => topN.CountExclusive > 0).map((topN, i) => ({
      rank: i + 1,
      function: topN.Frame.ExeFileName,
      samples: topN.CountExclusive,
      exclusiveCPU: (topN.CountExclusive / ctx.TotalCount) * 100,
      inclusiveCPU: (topN.CountInclusive / ctx.TotalCount) * 100,
    }));
  }, [ctx]);

  const columns = [
    {
      field: 'rank',
      name: 'Rank',
    },
    {
      field: 'function',
      name: 'Function',
    },
    {
      field: 'samples',
      name: 'Samples',
    },
    {
      field: 'exclusiveCPU',
      name: 'Exclusive CPU',
      render: (row: Row) => `${row.exclusiveCPU.toFixed(2)}%`,
    },
    {
      field: 'inclusiveCPU',
      name: 'Inclusive CPU',
      render: (row: Row) => `${row.inclusiveCPU.toFixed(2)}%`,
    },
  ];

  return (
    <>
      <EuiBasicTable items={rows} columns={columns} />
    </>
  );
};
