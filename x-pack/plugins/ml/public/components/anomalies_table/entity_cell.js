/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButtonIcon,
  EuiToolTip
} from '@elastic/eui';

/*
 * Component for rendering an entity cell in the anomalies table, displaying the value
 * of the 'partition', 'by' or 'over' field, and optionally links for adding or removing
 * a filter on this entity.
 */
export function EntityCell({ entityName, entityValue, filter }) {
  const valueText = (entityName !== 'mlcategory') ? entityValue : `mlcategory ${entityValue}`;
  return (
    <React.Fragment>
      {valueText}
      {filter !== undefined && entityName !== undefined && entityValue !== undefined &&
      <React.Fragment>
        <EuiToolTip content="Add filter">
          <EuiButtonIcon
            size="xs"
            className="filter-button"
            onClick={() => filter(entityName, entityValue, '+')}
            iconType="plusInCircle"
            aria-label="Add filter"
          />
        </EuiToolTip>
        <EuiToolTip content="Remove filter">
          <EuiButtonIcon
            size="xs"
            className="filter-button"
            onClick={() => filter(entityName, entityValue, '-')}
            iconType="minusInCircle"
            aria-label="Remove filter"
          />
        </EuiToolTip>
      </React.Fragment>
      }
    </React.Fragment>
  );
}

EntityCell.propTypes = {
  entityName: PropTypes.string,
  entityValue: PropTypes.any,
  filter: PropTypes.func
};
