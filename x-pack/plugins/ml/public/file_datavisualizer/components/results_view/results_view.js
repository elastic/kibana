/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import {
  EuiHorizontalRule,
  EuiTabbedContent,
} from '@elastic/eui';

import { FileContents } from '../file_contents';
import { Summary } from '../summary';
import { FieldsStats } from '../fields_stats';

export class ResultsView extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    const {
      data,
      results
    } = this.props;

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
        <FileContents
          data={data}
          format={results.format}
          numberOfLines={results.num_lines_analyzed}
        />

        <EuiHorizontalRule margin="l" />

        <Summary
          results={results}
        />

        <EuiHorizontalRule margin="l" />

        <EuiTabbedContent
          tabs={tabs}
          initialSelectedTab={tabs[0]}
          onTabClick={() => { }}
        />

      </div>
    );
  }
}
