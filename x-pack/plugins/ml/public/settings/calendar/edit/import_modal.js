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
  EuiCallOut,
  EuiCheckbox,
  EuiFilePicker,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer
} from '@elastic/eui';
import moment from 'moment';

import { EventsTable } from './events_table';

const icalendar = require('icalendar');

const MAX_FILE_SIZE_MB = 100;

export class ImportModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      includePastEvents: false,
      allImportedEvents: [],
      fileLoading: false,
      fileLoaded: false,
      errorMessage: null,
    };
  }

  selectedEvents = [];

  static createEvents = (ical) => {
    const events = ical.events();
    const mlEvents = [];

    events.forEach((e, i) => {
      if (e.element === 'VEVENT') {
        const description = e.properties.SUMMARY;
        const start = e.properties.DTSTART;
        const end = e.properties.DTEND;
        const recurring = (e.properties.RRULE !== undefined);

        if (description && start && end && description.length && start.length && end.length) {
          // Temp reference to unsaved events to allow removal from table
          const tempId = `${i}${start[0].value.valueOf()}`;

          mlEvents.push({
            event_id: tempId,
            description: description[0].value,
            start_time: start[0].value.valueOf(),
            end_time: end[0].value.valueOf(),
            asterisk: recurring
          });
        }
      }
    });
    return mlEvents;
  }

  static parseICSFile = (data) => {
    const cal = icalendar.parse_calendar(data);
    return ImportModal.createEvents(cal);
  }

  static filterEvents = (events) => {
    const now = moment().valueOf();
    return events.filter(e => e.start_time > now);
  }

  // move to utils?
  static readFile = (file) => {
    return new Promise((resolve, reject) => {
      if (file && file.size) {
        const reader = new FileReader();
        reader.readAsText(file);

        reader.onload = (() => {
          return () => {
            const data = reader.result;
            if (data === '') {
              reject();
            } else {
              resolve({ data });
            }
          };
        })(file);
      } else {
        reject();
      }
    });
  }

  handleImport = async (loadedFile) => {
    const incomingFile = loadedFile[0];
    const errorMessage = 'Could not parse ICS file.';
    let events = [];

    if (incomingFile && incomingFile.size <= (MAX_FILE_SIZE_MB * 1000000)) {
      this.setState({ fileLoading: true, fileLoaded: true });

      try {
        const parsedFile = await ImportModal.readFile(incomingFile);
        events = ImportModal.parseICSFile(parsedFile.data);

        this.setState({
          allImportedEvents: events,
          fileLoading: false,
          errorMessage: null,
          includePastEvents: false
        });
      } catch (error) {
        console.log(errorMessage, error);
        this.setState({ errorMessage, fileLoading: false });
      }
    } else if (incomingFile && incomingFile.size > (MAX_FILE_SIZE_MB * 1000000)) {
      this.setState({ fileLoading: false, errorMessage });
    } else {
      this.setState({ fileLoading: false, errorMessage: null });
    }
  }

  onEventDelete = (eventId) => {
    this.setState(prevState => ({
      allImportedEvents: prevState.allImportedEvents.filter(event => event.event_id !== eventId),
    }));
  }

  onCheckboxToggle = (e) => {
    this.setState({
      includePastEvents: e.target.checked,
    });
  };

  handleEventsAdd = () => {
    const events = this.selectedEvents.map((event) => ({
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time
    }));

    this.props.addImportedEvents(events);
  }

  renderCallout = () => (
    <EuiCallOut color="danger">
      <p>{this.state.errorMessage}</p>
    </EuiCallOut>
  );

  renderImportedEvents = () => {
    const {
      allImportedEvents,
      includePastEvents
    } = this.state;

    let showRecurringWarning = false;

    if (includePastEvents) {
      this.selectedEvents = allImportedEvents;
    } else {
      this.selectedEvents = ImportModal.filterEvents(allImportedEvents);
    }

    if (this.selectedEvents.find(e => e.asterisk) !== undefined) {
      showRecurringWarning = true;
    }

    return (
      <Fragment>
        <EuiSpacer size="s"/>
        <EuiFlexItem>
          <EuiText>
            <h4>Events to import: {this.selectedEvents.length}</h4>
            {showRecurringWarning && (
              <EuiText color="danger">
                <p>Recurring events not supported. Only the first event will be imported.</p>
              </EuiText>)
            }
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EventsTable
            eventsList={this.selectedEvents}
            onDeleteClick={this.onEventDelete}
          />
        </EuiFlexItem>
        <EuiSpacer size="m" />
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id="ml-include-past-events"
            label="Include past events"
            checked={includePastEvents}
            onChange={this.onCheckboxToggle}
          />
        </EuiFlexItem>
      </Fragment>
    );
  }

  render() {
    const { closeImportModal } = this.props;
    const {
      fileLoading,
      fileLoaded,
      allImportedEvents,
      errorMessage
    } = this.state;

    return (
      <Fragment>
        <EuiModal
          onClose={closeImportModal}
          maxWidth={true}
        >
          <EuiModalHeader>
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
            >
              <EuiFlexItem>
                <EuiModalHeaderTitle >
                  Import events
                </EuiModalHeaderTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <p>Import events from an ICS file.</p>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiFilePicker
                  compressed
                  initialPromptText="Select or drag and drop a file"
                  onChange={this.handleImport}
                  disabled={fileLoading}
                />
              </EuiFlexItem>
              {errorMessage !== null && this.renderCallout()}
              {allImportedEvents.length > 0 && this.renderImportedEvents()}
            </EuiFlexGroup>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButton
              onClick={this.handleEventsAdd}
              fill
              disabled={fileLoaded === false || errorMessage !== null}
            >
              Import
            </EuiButton>
            <EuiButtonEmpty
              onClick={closeImportModal}
            >
              Cancel
            </EuiButtonEmpty>
          </EuiModalFooter>
        </EuiModal>
      </Fragment>
    );
  }
}

ImportModal.propTypes = {
  addImportedEvents: PropTypes.func.isRequired,
  closeImportModal: PropTypes.func.isRequired,
};
