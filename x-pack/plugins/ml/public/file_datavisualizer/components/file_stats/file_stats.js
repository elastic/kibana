/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import {
  EuiDescriptionList,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

export class FileStats extends Component {
  constructor(props) {
    super(props);

    this.fields = createFields(this.props.results);
    console.log(this.fields);
  }

  render() {
    return (
      <React.Fragment>
        {
          this.fields.map(f => (
            <FieldStats
              field={f}
              key={f.name}
            />
          ))
        }
      </React.Fragment>
    );
  }
}

function FieldStats({ field }) {
  const items = createDisplayItems(field);

  return (
    <React.Fragment>
      <div className="field">
        <EuiTitle size="s">
          <h3><span style={{ fontWeight: 600 }}>{field.name}</span> ({field.percent}%)</h3>
        </EuiTitle>

        <EuiDescriptionList
          type="column"
          listItems={items}
          style={{ maxWidth: '300px' }}
        />
      </div>
      <EuiSpacer size="s" />
    </React.Fragment>
  );
}

function createFields(results) {
  const { mappings, field_stats: fieldStats } = results;
  let fields = [];

  if (results.input_fields && results.input_fields.length) {
    fields = results.input_fields.map((fName) => {
      const field = { name: fName };
      const f  = fieldStats[fName];
      const m  = mappings[fName];

      if (f !== undefined) {
        Object.assign(field, f);
      }

      if (m !== undefined) {
        field.type = m.type;
        if (m.format !== undefined) {
          field.format = m.format;
        }
      }

      field.percent = ((field.count / results.num_messages_analyzed) * 100);

      return field;
    });
    return fields;
  }
}

function createDisplayItems(field) {
  const items = [];
  if (field.type) {
    items.push(
      {
        title: 'Type',
        description: field.type,
      }
    );
  }

  if (field.cardinality) {
    items.push(
      {
        title: 'Distinct count',
        description: field.cardinality,
      }
    );
  }

  if (field.min_value) {
    items.push(
      {
        title: 'Min',
        description: field.min_value,
      }
    );
  }

  if (field.max_value) {
    items.push(
      {
        title: 'Max',
        description: field.max_value,
      }
    );
  }

  if (field.mean_value) {
    items.push(
      {
        title: 'Mean',
        description: field.mean_value,
      }
    );
  }

  if (field.median_value) {
    items.push(
      {
        title: 'Median',
        description: field.median_value,
      }
    );
  }
  return items;
}
