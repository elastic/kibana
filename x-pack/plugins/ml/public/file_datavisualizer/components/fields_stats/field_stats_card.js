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

  return (
    <React.Fragment>
      <div className="card-container">
        <div className="ml-field-data-card">
          <div
            className={`ml-field-title-bar ${type}`}
          >
            <FieldTypeIcon type={type} />
            <div className="field-name">{field.name}</div>
          </div>

          <div className="card-contents">
            <div className="stats">
              <div className="stat">
                <i className="fa fa-files-o" aria-hidden="true" /> {field.count} document{(field.count > 1) ? 's' : ''} ({percent}%)
              </div>
              <div className="stat">
                <i className="fa fa-cubes" aria-hidden="true" /> {field.cardinality} distinct value{(field.cardinality > 1) ? 's' : ''}
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
                  {field.top_hits.map(({ count, value }) => {
                    const pcnt = Math.round(((count / field.count) * 100) * 100) / 100;
                    return (
                      <div key={value} className="top-value">
                        <div className="field-label">{value}&nbsp;</div>
                        <div className="top-value-bar-holder">
                          <div
                            className={`top-value-bar ${type}`}
                            style={{ width: `${pcnt}%` }}
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
