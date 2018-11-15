/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component
} from 'react';

import { ml } from 'plugins/ml/services/ml_api_service';
import { JobGroup } from '../job_group';

import './styles/main.less';

import {
  EuiSearchBar,
  EuiCallOut,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

function loadGroups() {
  return ml.jobs.groups()
    .then((groups) => {
      return groups.map(g => ({
        value: g.id,
        view: (
          <div className="group-item">
            <JobGroup name={g.id} /> <span>({g.jobIds.length} job{(g.jobIds.length === 1) ? '' : 's'})</span>
          </div>
        )
      }));
    })
    .catch((error) => {
      console.log(error);
      return [];
    });
}

export class JobFilterBar extends Component {
  constructor(props) {
    super(props);

    this.state = { error: null };
    this.setFilters = props.setFilters;
  }

  onChange = ({ query, error }) => {
    if (error) {
      this.setState({ error });
    } else {
      let clauses = [];
      if (query && query.ast !== undefined && query.ast.clauses !== undefined) {
        clauses = query.ast.clauses;
      }
      this.setFilters(clauses);
      this.setState({ error: null });
    }
  };

  renderError() {
    const { error } = this.state;
    if (!error) {
      return;
    }
    return (
      <EuiFlexItem grow={false}>
        <EuiCallOut
          iconType="faceSad"
          color="danger"
          title={`Invalid search: ${error.message}`}
        />
        <EuiSpacer size="l" />
      </EuiFlexItem>
    );
  }

  render() {
    const filters = [
      {
        type: 'field_value_toggle_group',
        field: 'job_state',
        items: [
          {
            value: 'opened',
            name: 'Opened'
          },
          {
            value: 'closed',
            name: 'Closed'
          },
          {
            value: 'failed',
            name: 'Failed'
          }
        ]
      },
      {
        type: 'field_value_toggle_group',
        field: 'datafeed_state',
        items: [
          {
            value: 'started',
            name: 'Started'
          },
          {
            value: 'stopped',
            name: 'Stopped'
          }
        ]
      },
      {
        type: 'field_value_selection',
        field: 'groups',
        name: 'Group',
        multiSelect: 'or',
        cache: 10000,
        options: () => loadGroups()
      }

    ];

    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiSearchBar
            box={{
              incremental: true,
            }}
            filters={filters}
            onChange={this.onChange}
          />
        </EuiFlexItem>
        { this.renderError() || ''}
      </EuiFlexGroup>
    );
  }
}
JobFilterBar.propTypes = {
  setFilters: PropTypes.func.isRequired,
};

