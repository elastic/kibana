/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import { FieldStatsCard } from './field_stats_card';
import { getFieldNames } from './get_field_names';
import { ML_JOB_FIELD_TYPES } from '../../../../common/constants/field_types';

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
    num_messages_analyzed: numMessagesAnalyzed,
    timestamp_field: timestampField,
  } = results;

  if (mappings && fieldStats) {

    const fieldNames = getFieldNames(results);

    return fieldNames.map((name) => {
      if (fieldStats[name] !== undefined) {
        const field = { name };
        const f  = fieldStats[name];
        const m  = mappings[name];

        // sometimes the timestamp field is not in the mappings, and so our
        // collection of fields will be missing a time field with a type of date
        if (name === timestampField && field.type === undefined) {
          field.type = ML_JOB_FIELD_TYPES.DATE;
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
        // field is not in the field stats
        // this could be a text field or a field which the endpoint has
        // not been able to work out any information for
        const type = (mappings[name] && mappings[name].type === ML_JOB_FIELD_TYPES.TEXT) ?
          ML_JOB_FIELD_TYPES.TEXT : ML_JOB_FIELD_TYPES.UNKNOWN;

        return {
          name: name,
          type,
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
