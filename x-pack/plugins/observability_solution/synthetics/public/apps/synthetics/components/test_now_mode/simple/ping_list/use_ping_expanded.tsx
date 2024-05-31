/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { Ping } from '../../../../../../../common/runtime_types';

export const useExpandedPingList = (pings: Ping[]) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, JSX.Element>>({});

  const expandedIdsToRemove = JSON.stringify(
    Object.keys(expandedRows).filter((e) => !pings.some(({ docId }) => docId === e))
  );

  useEffect(() => {
    const parsed = JSON.parse(expandedIdsToRemove);
    if (parsed.length) {
      parsed.forEach((docId: string) => {
        delete expandedRows[docId];
      });
      setExpandedRows(expandedRows);
    }
  }, [expandedIdsToRemove, expandedRows]);

  return { expandedRows, setExpandedRows };
};
