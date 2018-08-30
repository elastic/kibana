/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for the header section of the edit filter list page, showing the
 * filter ID, description, number of items, and the jobs and detectors using the filter list.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { EditDescriptionPopover } from '../components/edit_description_popover';
import { FilterListUsagePopover } from '../components/filter_list_usage_popover';

export function EditFilterListHeader({
  filterId,
  totalItemCount,
  description,
  updateDescription,
  newFilterId,
  isNewFilterIdInvalid,
  updateNewFilterId,
  usedBy }) {

  const title = (filterId !== undefined) ? `Filter list ${filterId}` : 'Create new filter list';

  let idField;
  let descriptionField;
  let usedByElement;

  if (filterId === undefined) {
    const msg = 'Use lowercase alphanumerics (a-z and 0-9), hyphens or underscores;' +
      ' must start and end with an alphanumeric character';
    const helpText = (isNewFilterIdInvalid === false) ? msg : undefined;
    const error = (isNewFilterIdInvalid === true) ? [msg] : undefined;

    idField = (
      <EuiFormRow
        label="Filter list ID"
        helpText={helpText}
        error={error}
        isInvalid={isNewFilterIdInvalid}
      >
        <EuiFieldText
          name="new_filter_id"
          value={newFilterId}
          isInvalid={isNewFilterIdInvalid}
          onChange={(e) => updateNewFilterId(e.target.value)}
        />
      </EuiFormRow>
    );
  }

  if (description !== undefined && description.length > 0) {
    descriptionField = (
      <EuiText>
        <p>
          {description}
        </p>
      </EuiText>
    );
  } else {
    descriptionField = (
      <EuiText>
        <EuiTextColor color="subdued">
          Add a description
        </EuiTextColor>
      </EuiText>
    );
  }

  if (filterId !== undefined) {
    if (usedBy !== undefined && usedBy.jobs.length > 0) {
      usedByElement = (
        <React.Fragment>
          <div className="ml-filter-list-usage">
            <EuiText>
              This filter list is used in
            </EuiText>
            <FilterListUsagePopover
              entityType="detector"
              entityValues={usedBy.detectors}
            />
            <EuiText>
              across
            </EuiText>
            <FilterListUsagePopover
              entityType="job"
              entityValues={usedBy.jobs}
            />
          </div>
          <EuiSpacer size="s"/>
        </React.Fragment>
      );
    } else {
      usedByElement = (
        <React.Fragment>
          <EuiText>
            <p>
              This filter list is not used by any jobs.
            </p>
          </EuiText>
          <EuiSpacer size="s"/>
        </React.Fragment>
      );
    }
  }

  return (
    <React.Fragment>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="baseline" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h1>{title}</h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTextColor color="subdued">
                <p>{totalItemCount} {(totalItemCount !== 1) ? 'items' : 'item'} in total</p>
              </EuiTextColor>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m"/>
      {idField}
      <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          {descriptionField}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EditDescriptionPopover
            description={description}
            updateDescription={updateDescription}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s"/>
      {usedByElement}
    </React.Fragment>
  );

}
EditFilterListHeader.propTypes = {
  filterId: PropTypes.string,
  newFilterId: PropTypes.string,
  isNewFilterIdInvalid: PropTypes.bool,
  updateNewFilterId: PropTypes.func.isRequired,
  totalItemCount: PropTypes.number.isRequired,
  description: PropTypes.string,
  updateDescription: PropTypes.func.isRequired,
  usedBy: PropTypes.object
};
