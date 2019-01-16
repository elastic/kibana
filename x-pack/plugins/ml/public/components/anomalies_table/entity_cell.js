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
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

/*
 * Component for rendering an entity cell in the anomalies table, displaying the value
 * of the 'partition', 'by' or 'over' field, and optionally links for adding or removing
 * a filter on this entity.
 */
export const EntityCell = injectI18n(function EntityCell({ entityName, entityValue, filter, intl }) {
  const valueText = (entityName !== 'mlcategory') ? entityValue : `mlcategory ${entityValue}`;
  return (
    <React.Fragment>
      {valueText}
      {filter !== undefined && entityName !== undefined && entityValue !== undefined &&
      <React.Fragment>
        <EuiToolTip
          content={<FormattedMessage
            id="xpack.ml.anomaliesTable.entityCell.addFilterTooltip"
            defaultMessage="Add filter"
          />}
        >
          <EuiButtonIcon
            size="xs"
            className="filter-button"
            onClick={() => filter(entityName, entityValue, '+')}
            iconType="plusInCircle"
            aria-label={intl.formatMessage({
              id: 'xpack.ml.anomaliesTable.entityCell.addFilterAriaLabel',
              defaultMessage: 'Add filter'
            })}
          />
        </EuiToolTip>
        <EuiToolTip
          content={<FormattedMessage
            id="xpack.ml.anomaliesTable.entityCell.removeFilterTooltip"
            defaultMessage="Remove filter"
          />}
        >
          <EuiButtonIcon
            size="xs"
            className="filter-button"
            onClick={() => filter(entityName, entityValue, '-')}
            iconType="minusInCircle"
            aria-label={intl.formatMessage({
              id: 'xpack.ml.anomaliesTable.entityCell.removeFilterAriaLabel',
              defaultMessage: 'Remove filter'
            })}
          />
        </EuiToolTip>
      </React.Fragment>
      }
    </React.Fragment>
  );
});

EntityCell.WrappedComponent.propTypes = {
  entityName: PropTypes.string,
  entityValue: PropTypes.any,
  filter: PropTypes.func
};
