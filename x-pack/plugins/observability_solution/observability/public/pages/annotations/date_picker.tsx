/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export function DatePicker({
  start,
  end,
  setStart,
  setEnd,
  refetch,
}: {
  start: string;
  end: string;
  setStart: (val: string) => void;
  setEnd: (val: string) => void;
  refetch: () => void;
}) {
  const { uiSettings } = useKibana().services;

  return (
    <EuiSuperDatePicker
      css={{
        maxWidth: 500,
      }}
      onTimeChange={(val) => {
        setStart(val.start);
        setEnd(val.end);
      }}
      start={start}
      end={end}
      onRefresh={(val) => {
        setStart(val.start);
        setEnd(val.end);
        refetch();
      }}
      commonlyUsedRanges={uiSettings
        ?.get('timepicker:quickRanges')
        .map(({ from, to, display }: { from: string; to: string; display: string }) => {
          return {
            start: from,
            end: to,
            label: display,
          };
        })}
      updateButtonProps={{
        fill: false,
      }}
    />
  );
}
