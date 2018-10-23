/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiTabbedContent,
  EuiButton,
  EuiSpacer,
  EuiPanel,
} from '@elastic/eui';

import { FileContents } from '../file_contents';
import { AnalysisSummary } from '../analysis_summary';
import { FieldsStats } from '../fields_stats';

export function ResultsView({ data, results, showEditFlyout }) {

  console.log(results);

  const tabs = [
    {
      id: 'file-stats',
      name: 'File stats',
      content: <FieldsStats results={results} />,
    }
  ];

  return (
    <div className="results">
      <EuiPanel>
        <FileContents
          data={data}
          format={results.format}
          numberOfLines={results.num_lines_analyzed}
        />
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiPanel>
        <AnalysisSummary
          results={results}
        />

        <EuiSpacer size="m" />

        <EuiButton onClick={() => showEditFlyout()}>
          Override settings
        </EuiButton>
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiPanel>
        <EuiTabbedContent
          tabs={tabs}
          initialSelectedTab={tabs[0]}
          onTabClick={() => { }}
        />
      </EuiPanel>

    </div>
  );
}
