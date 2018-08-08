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
  EuiButton,
  EuiPopover,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
} from '@elastic/eui';

import { cloneDeep } from 'lodash';

import { ml } from '../../../../../services/ml_api_service';
import { GroupList } from './group_list';

function createSelectedGroups(jobs, groups) {
  const jobIds = jobs.map(j => j.id);
  const groupCounts = {};
  jobs.forEach((j) => {
    j.groups.forEach((g) => {
      if (groupCounts[g] === undefined) {
        groupCounts[g] = 0;
      }
      groupCounts[g]++;
    });
  });

  const selectedGroups = groups.reduce((p, c) => {
    if (c.jobIds.some(j => jobIds.includes(j))) {
      p[c.id] = {
        partial: (groupCounts[c.id] !== jobIds.length),
        // jobsIds: c.jobIds,
      };
    }
    return p;
  }, {});

  return selectedGroups;
}

export class GroupSelector extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
      groups: [],
      selectedGroups: {},
      edited: false,
      tempNewGroupName: '',
    };

    this.refreshJobs = this.props.refreshJobs;
  }

  static getDerivedStateFromProps(props, state) {
    if (state.edited === false) {
      const selectedGroups = createSelectedGroups(props.jobs, state.groups);
      return { selectedGroups };
    } else {
      return {};
    }
  }

  togglePopover = () => {
    if (this.state.isPopoverOpen) {
      this.closePopover();
    } else {
      ml.jobs.groups()
        .then((groups) => {
          const selectedGroups = createSelectedGroups(this.props.jobs, groups);

          this.setState({
            isPopoverOpen: true,
            edited: false,
            selectedGroups,
            groups,
          });
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }

  closePopover = () => {
    this.setState({
      edited: false,
      isPopoverOpen: false,
    });
  }

  selectGroup = (group) => {
    const newSelectedGroups = cloneDeep(this.state.selectedGroups);

    if (newSelectedGroups[group.id] === undefined) {
      newSelectedGroups[group.id] = {
        partial: false,
      };
    } else if (newSelectedGroups[group.id].partial === true) {
      newSelectedGroups[group.id].partial = false;
    } else {
      delete newSelectedGroups[group.id];
    }

    this.setState({
      selectedGroups: newSelectedGroups,
      edited: true,
    });
  }

  applyChanges = () => {
    const { selectedGroups } = this.state;
    const { jobs } = this.props;
    const newJobs = jobs.map(j => ({
      id: j.id,
      oldGroups: j.groups,
      newGroups: [],
    }));

    for (const gId in selectedGroups) {
      if (selectedGroups.hasOwnProperty(gId)) {
        const group = selectedGroups[gId];
        newJobs.forEach((j) => {
          if (group.partial === false || (group.partial === true && j.oldGroups.includes(gId))) {
            j.newGroups.push(gId);
          }
        });
      }
    }

    const tempJobs = newJobs.map(j => ({ job_id: j.id, groups: j.newGroups }));
    ml.jobs.updateGroups(tempJobs)
    	.then(() => {
        this.refreshJobs();
        this.closePopover();
      })
      .catch((error) => {
        console.error(error);
      });
  }

  validateNewGroupName = () => {

  }

  changeTempNewGroup = (e) => {
    this.setState({
      tempNewGroupName: e.target.value,
    });
  }

  addNewGroup = () => {
    const newGroup = {
      id: this.state.tempNewGroupName,
      calendarIds: [],
      jobIds: [],
    };

    const groups = this.state.groups;
    groups.push(newGroup);

    this.setState({
      groups,
      tempNewGroupName: '',
    });
  }

  render() {
    const {
      groups,
      selectedGroups,
      edited,
      tempNewGroupName,
    } = this.state;
    const button = (
      <EuiButtonIcon
        iconType="indexEdit"
        aria-label="Manage job groups"
        onClick={() => this.togglePopover()}
      />
    );

    return (
      <EuiPopover
        id="trapFocus"
        ownFocus
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={() => this.closePopover()}
      >

        <GroupList
          groups={groups}
          selectedGroups={selectedGroups}
          selectGroup={this.selectGroup}
        />

        <div>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem>
              <EuiFieldText
                compressed
                placeholder="Add new group"
                value={tempNewGroupName}
                onChange={this.changeTempNewGroup}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                onClick={this.addNewGroup}
                iconType="plusInCircle"
                aria-label="Add"
                disabled={(tempNewGroupName === '')}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <div>
          <EuiHorizontalRule margin="m" />
          <EuiButton
            size="s"
            onClick={this.applyChanges}
            isDisabled={(edited === false)}
          >
            Apply
          </EuiButton>
        </div>
      </EuiPopover>
    );
  }
}
GroupSelector.propTypes = {
  jobs: PropTypes.array.isRequired,
  refreshJobs: PropTypes.func.isRequired,
};
