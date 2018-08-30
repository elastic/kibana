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
  EuiDatePicker,
} from '@elastic/eui';

import './styles/main.less';

import moment from 'moment';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export class TimeRangeSelector extends Component {
  constructor(props) {
    super(props);

    this.state = {
      startTab: 0,
      endTab: 1,
    };
    this.latestTimeStamp = this.props.startTime;
    this.now = this.props.now;
  }

  setStartTab = (tab) => {
    this.setState({ startTab: tab });
    switch (tab) {
      case 0:
        this.setStartTime(undefined);
        break;
      case 1:
        this.setStartTime(this.now);
        break;
      default:
        break;
    }
  }

  setEndTab = (tab) => {
    this.setState({ endTab: tab });
    switch (tab) {
      case 0:
        this.setEndTime(undefined);
        break;
      case 1:
        this.setEndTime(this.now);
        break;
      default:
        break;
    }
  }

  setStartTime = (time) => {
    this.props.setStartTime(time);
  }

  setEndTime = (time) => {
    this.props.setEndTime(time);
  }

  getTabItems() {
    const datePickerTimes = {
      start: (moment.isMoment(this.props.startTime)) ? this.props.startTime : this.latestTimeStamp,
      end: (moment.isMoment(this.props.endTime)) ? this.props.endTime : this.now,
    };
    const formattedStartTime = this.latestTimeStamp.format(TIME_FORMAT);
    const startItems = [
      { index: 0, label: `Continue from ${formattedStartTime}` },
      { index: 1, label: 'Continue from now' },
      { index: 2, label: 'Continue from specified time',
        body: (
          <EuiDatePicker
            selected={datePickerTimes.start}
            onChange={this.setStartTime}
            maxDate={datePickerTimes.end}
            inline
            showTimeSelect
          />)
      },
    ];
    const endItems = [
      { index: 0, label: 'No end time (Real-time search)' },
      { index: 1, label: 'Specify end time',
        body: (
          <EuiDatePicker
            selected={datePickerTimes.end}
            onChange={this.setEndTime}
            minDate={datePickerTimes.start}
            inline
            showTimeSelect
          />)
      },
    ];
    return {
      startItems,
      endItems
    };
  }

  render() {
    const { startItems, endItems } = this.getTabItems();
    return (
      <div className="time-range-selector">
        <div className="time-range-section-container">
          <TabStack
            title="Search start time"
            items={startItems}
            switchState={this.state.startTab}
            switchFunc={this.setStartTab}
          />
          <TabStack
            title="Search end time"
            items={endItems}
            switchState={this.state.endTab}
            switchFunc={this.setEndTab}
          />
        </div>
      </div>
    );
  }
}

function TabStack({ title, items, switchState, switchFunc }) {
  return (
    <div className="time-range-section">
      <div className="time-range-section-title">{title}</div>
      <ul className="tab-stack">
        {
          items.map((item, i) => {
            let className = '';
            if (switchState === item.index) {
              className += 'active ';
            }
            if (item.body !== undefined) {
              className += 'has-body ';
            }

            return (
              <li key={i} className={className} >
                <a onClick={() => switchFunc(item.index)}>{item.label}</a>
                {(item.body !== undefined) &&
                  <div className="body">
                    {item.body}
                  </div>
                }
              </li>
            );
          })
        }
      </ul>
    </div>
  );
}
TimeRangeSelector.propTypes = {
  startTime: PropTypes.object.isRequired,
  endTime: PropTypes.object,
  setStartTime: PropTypes.func.isRequired,
  setEndTime: PropTypes.func.isRequired,
};
