/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { EuiIcon, keys } from '@elastic/eui';

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
    return <div className="check" />;
  }
}

export class GroupList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      groups: [],
    };
    // keep track of each of the group item refs
    this.selectItems = [];
  }

  selectGroup = (group) => {
    this.props.selectGroup(group);
  };

  moveUp = (event, index) => {
    event.preventDefault();
    if (index < 0) {
      return;
    } else if (index > 0) {
      this.selectItems[index - 1].focus();
    }
  };

  moveDown = (event, index) => {
    event.preventDefault();
    if (index < this.selectItems.length - 1) {
      this.selectItems[index + 1].focus();
    }
  };

  handleKeyDown = (event, group, index) => {
    switch (event.key) {
      case keys.ENTER:
        this.selectGroup(group);
        break;
      case keys.SPACE:
        this.selectGroup(group);
        break;
      case keys.ARROW_DOWN:
        this.moveDown(event, index);
        break;
      case keys.ARROW_UP:
        this.moveUp(event, index);
        break;
    }
  };

  setRef = (ref, index) => {
    this.selectItems[index] = ref;
  };

  render() {
    const { selectedGroups, groups } = this.props;

    return (
      <div className="group-list">
        {groups.map((g, index) => (
          <div
            tabIndex={'0'}
            onKeyDown={(event) => this.handleKeyDown(event, g, index)}
            key={g.id}
            className="group-item"
            onClick={() => this.selectGroup(g)}
            ref={(ref) => this.setRef(ref, index)}
          >
            <Check group={g} selectedGroups={selectedGroups} />
            <JobGroup name={g.id} />
          </div>
        ))}
      </div>
    );
  }
}
GroupList.propTypes = {
  selectedGroups: PropTypes.object.isRequired,
  groups: PropTypes.array.isRequired,
  selectGroup: PropTypes.func.isRequired,
};
