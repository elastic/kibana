/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
  Fragment
} from 'react';
import { PropTypes } from 'prop-types';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDatePicker,
  EuiDatePickerRange,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSpacer,
  EuiTabbedContent,
} from '@elastic/eui';
import moment from 'moment';


export class NewEventModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      startDate: moment().startOf('day'),
      endDate: moment().startOf('day').add(1, 'days'),
      description: '',
      selectedTabId: 'Single day',
    };
  }

  onDescriptionChange = (e) => {
    this.setState({
      description: e.target.value,
    });
  };

  onSelectedTabChanged = (tab) => {
    this.setState({
      selectedTabId: tab.id,
    });
  }

  handleAddEvent = () => {
    const { description, startDate, endDate } = this.state;
    const event = {
      description,
      start_time: startDate.valueOf(),
      end_time: endDate.valueOf()
    };

    this.props.addEvent(event);
  }

  handleSingleDayDateChange = (date) => {
    let start = null;
    let end = null;

    const startMoment = moment(date);
    const endMoment = moment(date);

    start = startMoment.startOf('day');
    end = endMoment.startOf('day').add(1, 'days');
    this.setState({ startDate: start, endDate: end });
  }

  handleChangeStart = (date) => {
    let start = null;
    let end = this.state.endDate;

    const startMoment = moment(date);
    const endMoment = moment(date);

    start = startMoment.startOf('day');

    if (start > end) {
      end = endMoment.startOf('day').add(1, 'days');
    }
    this.setState({ startDate: start, endDate: end });
  }

  handleChangeEnd = (date) => {
    let start = this.state.startDate;
    let end = null;

    const startMoment = moment(date);
    const endMoment = moment(date);

    end = endMoment.startOf('day');

    if (start > end) {
      start = startMoment.startOf('day').subtract(1, 'days');
    }
    this.setState({ startDate: start, endDate: end });
  }

  getTabs = () => [{
    id: 'Single day',
    name: 'Single day',
    content: (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiDatePicker
          selected={this.state.startDate}
          onChange={this.handleSingleDayDateChange}
          inline
        />
      </Fragment>
    ),
  }, {
    id: 'Day range',
    name: 'Day range',
    content: this.renderRangedDatePicker()
  }, {
    id: 'Time range',
    name: 'Time range',
    content: this.renderRangedDatePicker()
  }];

  // TODO time range has the text input
  renderRangedDatePicker = () => {
    const { startDate, endDate, selectedTabId } = this.state;

    return (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiDatePickerRange
          iconType={false}
          startDateControl={
            <EuiDatePicker
              inline
              selected={startDate}
              onChange={this.handleChangeStart}
              startDate={startDate}
              endDate={endDate}
              isInvalid={startDate > endDate}
              aria-label="Start date"
              timeFormat="HH:mm"
              showTimeSelect={selectedTabId === 'Time range'}
            />
          }
          endDateControl={
            <EuiDatePicker
              inline
              selected={endDate}
              onChange={this.handleChangeEnd}
              startDate={startDate}
              endDate={endDate}
              isInvalid={startDate > endDate}
              aria-label="End date"
              timeFormat="HH:mm"
              showTimeSelect={selectedTabId === 'Time range'}
            />
          }
        />
      </Fragment>
    );
  }

  render() {
    const { closeModal } = this.props;
    const { description } = this.state;
    const tabs = this.getTabs();

    return (
      <Fragment>
        <EuiModal
          onClose={closeModal}
          initialFocus="[name=description]"
          maxWidth={false}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle >
              Create new event
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiForm>
              <EuiFormRow
                label="Description"
                fullWidth
              >
                <EuiFieldText
                  name="description"
                  onChange={this.onDescriptionChange}
                  isInvalid={!description}
                  fullWidth
                />
              </EuiFormRow>

              <EuiTabbedContent
                size="s"
                tabs={tabs}
                initialSelectedTab={tabs[0]}
                onTabClick={this.onSelectedTabChanged}
              />

            </EuiForm>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButton
              onClick={this.handleAddEvent}
              fill
              disabled={!description}
            >
              Add
            </EuiButton>
            <EuiButtonEmpty
              onClick={closeModal}
            >
              Cancel
            </EuiButtonEmpty>
          </EuiModalFooter>
        </EuiModal>
      </Fragment>
    );
  }
}

NewEventModal.propTypes = {
  closeModal: PropTypes.func.isRequired,
  addEvent: PropTypes.func.isRequired,
};
