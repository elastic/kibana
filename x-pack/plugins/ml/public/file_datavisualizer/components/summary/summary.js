/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiDescriptionList,
  EuiTitle,
} from '@elastic/eui';

export function Summary({ results }) {
  const items = [
    {
      title: 'Number of lines analysed',
      description: results.num_lines_analyzed,
    },
    {
      title: 'Charset',
      description: results.charset,
    }

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
    }
  }

  return (
    <React.Fragment>
      <EuiTitle size="s">
        <h3>Summary</h3>
      </EuiTitle>
      <EuiDescriptionList
        type="column"
        listItems={items}
        style={{ maxWidth: '400px' }}
      />
    </React.Fragment>
  );
}
