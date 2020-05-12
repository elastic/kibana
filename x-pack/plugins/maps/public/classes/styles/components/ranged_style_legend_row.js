/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer, EuiToolTip } from '@elastic/eui';

export function RangedStyleLegendRow({ header, minLabel, maxLabel, propertyLabel, fieldLabel }) {
  return (
    <div>
      <EuiSpacer size="xs" />
      {header}
      <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
        <EuiFlexItem grow={true}>
          <EuiText size="xs">
            <small>{minLabel}</small>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" title={propertyLabel} content={fieldLabel}>
            <EuiText className="eui-textTruncate" size="xs" style={{ maxWidth: '180px' }}>
              <small>
                <strong>{fieldLabel}</strong>
              </small>
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiText textAlign="right" size="xs">
            <small>{maxLabel}</small>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

RangedStyleLegendRow.propTypes = {
  header: PropTypes.node.isRequired,
  minLabel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  maxLabel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  propertyLabel: PropTypes.string.isRequired,
  fieldLabel: PropTypes.string.isRequired,
};
