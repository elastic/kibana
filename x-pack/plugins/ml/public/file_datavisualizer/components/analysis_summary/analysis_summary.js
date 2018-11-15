/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiTitle,
  EuiSpacer,
  EuiDescriptionList,
} from '@elastic/eui';

export function AnalysisSummary({ results }) {
  const items = createDisplayItems(results);

  return (
    <React.Fragment>
      <EuiTitle size="s">
        <h3>Summary</h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiDescriptionList
        type="column"
        listItems={items}
        className="analysis-summary-list"
      />
    </React.Fragment>
  );
}

function createDisplayItems(results) {
  const items = [
    {
      title: 'Number of lines analyzed',
      description: results.num_lines_analyzed,
    },
    // {
    //   title: 'Charset',
    //   description: results.charset,
    // }
  ];

  if (results.format !== undefined) {
    items.push({
      title: 'Format',
      description: results.format,
    });

    if (results.format === 'delimited') {
      items.push({
        title: 'Delimiter',
        description: results.delimiter,
      });

      items.push({
        title: 'Has header row',
        description: `${results.has_header_row}`,
      });

    }
  }

  if (results.grok_pattern !== undefined) {
    items.push({
      title: 'Grok pattern',
      description: results.grok_pattern,
    });
  }

  if (results.timestamp_field !== undefined) {
    items.push({
      title: 'Time field',
      description: results.timestamp_field,
    });
  }

  if (results.joda_timestamp_formats !== undefined) {
    const s = (results.joda_timestamp_formats.length > 1) ? 's' : '';
    items.push({
      title: `Time format${s}`,
      description: results.joda_timestamp_formats.join(', '),
    });
  }

  return items;
}
