/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiSpacer,

} from '@elastic/eui';

import { FieldTypeIcon } from '../../../components/field_type_icon';

export function FieldStatsCard({ field }) {

  const percent = Math.round(field.percent * 100) / 100;

  let type = field.type;
  if (type === 'double' || type === 'long') {
    type = 'number';
  }
  const typeColor = getTypeColor(type);

  return (
    <React.Fragment>
      <div className="card-container">
        <div className="ml-field-data-card">
          <div
            style={{ backgroundColor: typeColor }}
            className="ml-field-title-bar"
          >
            <FieldTypeIcon type={type} />
            <div className="field-name">{field.name}</div>
          </div>

          <div className="card-contents">
            <div className="stats">
              <div className="stat">
                <i className="fa fa-files-o" aria-hidden="true" /> {field.count} documents ({percent}%)
              </div>
              <div className="stat">
                <i className="fa fa-cubes" aria-hidden="true" /> {field.cardinality} distinct values
              </div>

              {
                (field.mean_value) &&
                <React.Fragment>
                  <div>
                    <div className="stat min heading">min</div>
                    <div className="stat median heading">median</div>
                    <div className="stat max heading">max</div>
                  </div>
                  <div>
                    <div className="stat min heading">{field.min_value}</div>
                    <div className="stat median heading">{field.median_value}</div>
                    <div className="stat max heading">{field.max_value}</div>
                  </div>
                </React.Fragment>
              }
            </div>

            {
              (field.top_hits) &&
              <React.Fragment>

                <EuiSpacer size="s" />

                <div className="stats">
                  <div className="stat">top values</div>
                  {field.top_hits.map((h) => {
                    const pcnt = Math.round(((h.count / field.count) * 100) * 100) / 100;
                    return (
                      <div key={h.value} className="top-value">
                        <div className="field-label">{h.value}&nbsp;</div>
                        <div className="top-value-bar-holder">
                          <div
                            className="top-value-bar"
                            style={{ width: `${pcnt}%`, backgroundColor: typeColor }}
                          />
                        </div>
                        <div className="count-label">{pcnt}%</div>
                      </div>
                    );
                  }
                  )}
                </div>
              </React.Fragment>
            }

          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

function getTypeColor(type) {

  switch (type) {
    case 'boolean':
      return '#e6c220';
    case 'date':
      return '#f98510';
    case 'document_count':
      return '#db1374';
    case 'geo_point':
      return '#461a0a';
    case 'ip':
      return '#490092';
    case 'keyword':
      return '#00b3a4';
    case 'number':
      return '#3185fc';
    case 'text':
      return '#920000';

    default:
      return '#bfa180';
  }
}
