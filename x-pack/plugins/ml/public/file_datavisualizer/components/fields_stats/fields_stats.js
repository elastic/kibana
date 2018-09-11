/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import { FieldStatsCard } from './field_stats_card';

export class FieldsStats extends Component {
  constructor(props) {
    super(props);

    this.fields = createFields(this.props.results);
    console.log(this.fields);
  }

  render() {
    return (
      <div className="fields-stats">
        {
          this.fields.map(f => (
            <FieldStatsCard
              field={f}
              key={f.name}
            />
          ))
        }
      </div>
    );
  }
}

function createFields(results) {
  const {
    mappings,
    field_stats: fieldStats,
    num_messages_analyzed: numMessagesAnalyzed,
    timestamp_field: timestampField,
  } = results;

  let fields = [];

  if (mappings && fieldStats) {
    fields = Object.keys(fieldStats).map((fName) => {
      const field = { name: fName };
      const f  = fieldStats[fName];
      const m  = mappings[fName];

      // sometimes the timestamp field is not in the mappings, and so our
      // collection of fields will be missing a time field with a type of date
      if (fName === timestampField && field.type === undefined) {
        field.type = 'date';
      }

      if (f !== undefined) {
        Object.assign(field, f);
      }

      if (m !== undefined) {
        field.type = m.type;
        if (m.format !== undefined) {
          field.format = m.format;
        }
      }

      field.percent = ((field.count / numMessagesAnalyzed) * 100);

      return field;
    });
  }
  return fields;
}
