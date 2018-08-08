/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component,
} from 'react';

import {
  EuiIcon,
} from '@elastic/eui';

import './styles/main.less';

import { JobGroup } from '../../../job_group';

function Check({ group, selectedGroups }) {
  if (selectedGroups[group.id] !== undefined) {
    if (selectedGroups[group.id].partial) {
      return (
        <div className="check selected">
          <span>&mdash;</span>
        </div>
      );
    } else {
      return (
        <div className="check selected">
          <EuiIcon type="check" />
        </div>
      );
    }
  } else {
    return (
      <div className="check" />
    );
  }
}

export class GroupList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      groups: [],
    };
  }

  selectGroup = (group) => {
    this.props.selectGroup(group);
  }

  render() {
    const { selectedGroups, groups } = this.props;
    return (
      <div className="group-list">
        {
          groups.map(g => (
            <div
              key={g.id}
              className="group-item"
              onClick={() => this.selectGroup(g)}
            >
              <Check group={g} selectedGroups={selectedGroups} />
              <JobGroup name={g.id} />
            </div>
          ))
        }
      </div>
    );
  }
}
GroupList.propTypes = {
  selectedGroups: PropTypes.object.isRequired,
  groups: PropTypes.array.isRequired,
  selectGroup: PropTypes.func.isRequired,
};
