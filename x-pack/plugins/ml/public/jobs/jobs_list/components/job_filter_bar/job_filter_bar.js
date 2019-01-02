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

import {
  EuiSearchBar,
  EuiCallOut,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

function loadGroups() {
  return ml.jobs.groups()
    .then((groups) => {
      return groups.map(g => ({
        value: g.id,
        view: (
          <div className="group-item">
            <JobGroup name={g.id} />&nbsp;
            <span>
              <FormattedMessage
                id="xpack.ml.jobsList.jobFilterBar.jobGroupTitle"
                defaultMessage="({jobsCount, plural, one {# job} other {# jobs}})"
                values={{ jobsCount: g.jobIds.length }}
              />
            </span>
          </div>
        )
      }));
    })
    .catch((error) => {
      console.log(error);
      return [];
    });
}

class JobFilterBarUI extends Component {
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
          color="danger"
          title={(<FormattedMessage
            id="xpack.ml.jobsList.jobFilterBar.invalidSearchErrorMessage"
            defaultMessage="Invalid search: {errorMessage}"
            values={{ errorMessage: error.message }}
          />
          )}
        />
        <EuiSpacer size="l" />
      </EuiFlexItem>
    );
  }

  render() {
    const { intl } = this.props;
    const filters = [
      {
        type: 'field_value_toggle_group',
        field: 'job_state',
        items: [
          {
            value: 'opened',
            name: intl.formatMessage({
              id: 'xpack.ml.jobsList.jobFilterBar.openedLabel',
              defaultMessage: 'Opened'
            })
          },
          {
            value: 'closed',
            name: intl.formatMessage({
              id: 'xpack.ml.jobsList.jobFilterBar.closedLabel',
              defaultMessage: 'Closed'
            })
          },
          {
            value: 'failed',
            name: intl.formatMessage({
              id: 'xpack.ml.jobsList.jobFilterBar.failedLabel',
              defaultMessage: 'Failed'
            })
          }
        ]
      },
      {
        type: 'field_value_toggle_group',
        field: 'datafeed_state',
        items: [
          {
            value: 'started',
            name: intl.formatMessage({
              id: 'xpack.ml.jobsList.jobFilterBar.startedLabel',
              defaultMessage: 'Started'
            })
          },
          {
            value: 'stopped',
            name: intl.formatMessage({
              id: 'xpack.ml.jobsList.jobFilterBar.stoppedLabel',
              defaultMessage: 'Stopped'
            })
          }
        ]
      },
      {
        type: 'field_value_selection',
        field: 'groups',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobFilterBar.groupLabel',
          defaultMessage: 'Group'
        }),
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
            className="mlJobFilterBar"
          />
        </EuiFlexItem>
        { this.renderError() || ''}
      </EuiFlexGroup>
    );
  }
}
JobFilterBarUI.propTypes = {
  setFilters: PropTypes.func.isRequired,
};

export const JobFilterBar = injectI18n(JobFilterBarUI);
