/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import { Source } from '../../../containers/source';
import { LogsPageLogsContent } from './page_logs_content';
import { LogsPageNoIndicesContent } from './page_no_indices_content';

export const StreamPageContent: React.FunctionComponent = () => {
  const { logIndicesExist } = useContext(Source.Context);

  return <>{logIndicesExist ? <LogsPageLogsContent /> : <LogsPageNoIndicesContent />}</>;
};
