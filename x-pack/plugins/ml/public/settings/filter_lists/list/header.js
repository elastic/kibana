/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for the header section of the filter lists page.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiButtonEmpty,
} from '@elastic/eui';

export function FilterListsHeader({ totalCount, refreshFilterLists }) {
  return (
    <React.Fragment>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="baseline" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h1>Filter Lists</h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTextColor color="subdued">
                <p>{totalCount} in total</p>
              </EuiTextColor>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="baseline" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="refresh"
                onClick={() => refreshFilterLists()}
              >
                Refresh
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m"/>
      <EuiText>
        <p>
          <EuiTextColor color="subdued">
            From here you can create and edit filter lists for use in detector rules for scoping whether the rule should
            apply to a known set of values.
          </EuiTextColor>
        </p>
      </EuiText>
      <EuiSpacer size="m"/>
    </React.Fragment>
  );

}
FilterListsHeader.propTypes = {
  totalCount: PropTypes.number.isRequired,
  refreshFilterLists: PropTypes.func.isRequired
};
