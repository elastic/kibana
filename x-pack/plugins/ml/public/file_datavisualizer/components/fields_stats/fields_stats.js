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

    this.state = {
      fields: []
    };
  }

  componentDidMount() {
    this.setState({
      fields: createFields(this.props.results)
    });
  }

  render() {
    return (
      <div className="fields-stats">
        {
          this.state.fields.map(f => (
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
    column_names: columnNames,
    num_messages_analyzed: numMessagesAnalyzed,
    timestamp_field: timestampField,
  } = results;

  if (mappings && fieldStats) {
    // if columnNames exists (i.e delimited) use it for the field list
    // so we get the same order
    const tempFields = (columnNames !== undefined) ? columnNames : Object.keys(fieldStats);

    return tempFields.map((fName) => {
      if (fieldStats[fName] !== undefined) {
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
      } else {
        return {
          name: fName,
          mean_value: 0,
          count: 0,
          cardinality: 0,
          percent: 0,
        };
      }
    });
  }

  return [];
}
