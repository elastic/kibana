/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

// import {
//   EuiDescriptionList,
//   EuiTitle,
//   EuiSpacer,
// } from '@elastic/eui';

import { FieldStatsCard } from './field_stats_card';

export class FileStats extends Component {
  constructor(props) {
    super(props);
    super(props);

    this.fields = createFields(this.props.results);
    console.log(this.fields);
  }

  render() {
    return (
      <div className="field-stats">
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
  const { mappings, field_stats: fieldStats } = results;
  let fields = [];

  if (mappings && fieldStats) {
    fields = Object.keys(fieldStats).map((fName) => {
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
  }
  return fields;
}
