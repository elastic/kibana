/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React popover listing the jobs or detectors using a particular filter list in a custom rule.
 */

import PropTypes from 'prop-types';
import React, {
  Component,
} from 'react';

import {
  EuiButtonEmpty,
  EuiPopover,
} from '@elastic/eui';


export class FilterListUsagePopover extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  }

  render() {
    const {
      entityType,
      entityValues } = this.props;

    const linkText = `${entityValues.length} ${entityType}${(entityValues.length !== 1) ? 's' : ''}`;

    const listItems = entityValues.map(value => (<li key={value}>{value}</li>));

    const button = (
      <EuiButtonEmpty
        size="s"
        color="primary"
        onClick={this.onButtonClick}
      >
        {linkText}
      </EuiButtonEmpty>
    );

    return (
      <div>
        <EuiPopover
          id={`${entityType}_filter_list_usage`}
          panelClassName="ml-filter-list-usage-popover"
          ownFocus
          button={button}
          isOpen={this.state.isPopoverOpen}
          closePopover={this.closePopover}
        >
          <ul>
            {listItems}
          </ul>
        </EuiPopover>
      </div>
    );
  }
}
FilterListUsagePopover.propTypes = {
  entityType: PropTypes.oneOf(['job', 'detector']),
  entityValues: PropTypes.array.isRequired
};

