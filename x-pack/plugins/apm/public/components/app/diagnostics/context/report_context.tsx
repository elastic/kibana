/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { DiagnosticsReport } from '../import_export_tab';

export const ReportContext = React.createContext<{
  report: DiagnosticsReport | undefined;
  setReport: (report: DiagnosticsReport) => void;
}>({ report: undefined, setReport: () => {} });

export function ReportContextProvider({
  children,
}: {
  children: React.ReactChild;
}) {
  const [report, setReport] = useState<DiagnosticsReport | undefined>(
    undefined
  );

  const contextValue = useMemo(
    () => ({ report, setReport }),
    [report, setReport]
  );

  // render rest of application and pass down license via context
  return <ReportContext.Provider value={contextValue} children={children} />;
}
