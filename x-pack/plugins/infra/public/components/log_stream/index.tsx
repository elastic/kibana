/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useLogStream } from '../../containers/logs/log_stream';

interface LogStreamProps {
  startTimestamp: number;
  endTimestamp: number;
}

export const LogStream: React.FC<LogStreamProps> = ({ startTimestamp, endTimestamp }) => {
  const { entries, fetchEntries } = useLogStream({ startTimestamp, endTimestamp });

  useEffect(() => fetchEntries(), [fetchEntries]);

  return <span>It works!</span>;
};
