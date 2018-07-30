/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for rendering the form fields for editing the scope section of a rule.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiCallOut,
  EuiCheckbox,
  EuiLink,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { ScopeExpression } from './scope_expression';
import { checkPermission } from 'plugins/ml/privilege/check_privilege';
import { getScopeFieldDefaults } from './utils';


function NoFilterListsCallOut() {
  return (
    <EuiCallOut
      title="No filter lists configured"
      iconType="gear"
    >
      <p>
        To configure scope, you must first use the&nbsp;
        <EuiLink href="#/settings/filter_lists">Filter Lists</EuiLink> settings page
        to create the list of values you want to include or exclude in the rule.
      </p>
    </EuiCallOut>
  );
}

function NoPermissionCallOut() {
  return (
    <EuiCallOut
      title="You do not have permission to view filter lists"
      iconType="gear"
    />
  );
}

export function ScopeSection({
  isEnabled,
  onEnabledChange,
  partitioningFieldNames,
  filterListIds,
  scope,
  updateScope }) {

  const canGetFilters = checkPermission('canGetFilters');

  if (partitioningFieldNames === null || partitioningFieldNames.length === 0) {
    return null;
  }

  let content;
  if (filterListIds.length > 0) {
    content = partitioningFieldNames.map((fieldName, index) => {
      let filterValues;
      if (scope !== undefined && scope[fieldName] !== undefined) {
        filterValues = scope[fieldName];
      } else {
        filterValues = getScopeFieldDefaults(filterListIds);
      }

      return (
        <ScopeExpression
          key={index}
          fieldName={fieldName}
          filterId={filterValues.filter_id}
          filterType={filterValues.filter_type}
          enabled={filterValues.enabled}
          filterListIds={filterListIds}
          updateScope={updateScope}
        />
      );
    });
  } else if(canGetFilters === false) {
    content = <NoPermissionCallOut />;
  } else {
    content = <NoFilterListsCallOut />;
  }

  return (
    <React.Fragment>
      <EuiTitle>
        <h2>Scope</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCheckbox
        id="enable_scope_checkbox"
        label="Add a filter list to limit where the rule applies."
        checked={isEnabled}
        onChange={onEnabledChange}
      />
      <EuiSpacer size="s" />
      {isEnabled &&
        <React.Fragment>
          {content}
        </React.Fragment>
      }
      <EuiSpacer size="xxl" />
    </React.Fragment>
  );

}
ScopeSection.propTypes = {
  isEnabled: PropTypes.bool.isRequired,
  onEnabledChange: PropTypes.func.isRequired,
  partitioningFieldNames: PropTypes.array.isRequired,
  filterListIds: PropTypes.array.isRequired,
  scope: PropTypes.object,
  updateScope: PropTypes.func.isRequired
};
