/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

/*
 * Component for rendering an entity in the anomalies table, displaying the value
 * of the entity, such as a partitioning or influencer field value, and optionally links for
 * adding or removing a filter on this entity.
 */
export const EntityCell = injectI18n(function EntityCell({
  entityName,
  entityValue,
  filter,
  intl,
  wrapText = false
}) {
  const valueText = (entityName !== 'mlcategory') ? entityValue : `mlcategory ${entityValue}`;
  const textStyle = { maxWidth: '100%' };
  const textWrapperClass = (wrapText ? 'field-value-long' : 'field-value-short');
  return (
    <EuiFlexGroup
      direction="row"
      alignItems="center"
      gutterSize="none"
    >
      <EuiFlexItem grow={false} style={textStyle}>
        <EuiText
          size="xs"
          className={textWrapperClass}
        >
          {valueText}
        </EuiText>
      </EuiFlexItem>
      {filter !== undefined && entityName !== undefined && entityValue !== undefined &&
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false}>
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
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
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
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      }
    </EuiFlexGroup>
  );
});

EntityCell.WrappedComponent.propTypes = {
  entityName: PropTypes.string,
  entityValue: PropTypes.any,
  filter: PropTypes.func
};
