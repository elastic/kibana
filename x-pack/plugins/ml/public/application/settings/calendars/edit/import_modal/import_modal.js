/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { PropTypes } from 'prop-types';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFilePicker,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { ImportedEvents } from '../imported_events';
import { readFile, parseICSFile, filterEvents } from './utils';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

const MAX_FILE_SIZE_MB = 100;

export class ImportModal extends Component {
  static propTypes = {
    addImportedEvents: PropTypes.func.isRequired,
    closeImportModal: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      includePastEvents: false,
      allImportedEvents: [],
      selectedEvents: [],
      fileLoading: false,
      fileLoaded: false,
      errorMessage: null,
    };
  }

  handleImport = async loadedFile => {
    const incomingFile = loadedFile[0];
    const errorMessage = i18n.translate(
      'xpack.ml.calendarsEdit.importModal.couldNotParseICSFileErrorMessage',
      {
        defaultMessage: 'Could not parse ICS file.',
      }
    );
    let events = [];

    if (incomingFile && incomingFile.size <= MAX_FILE_SIZE_MB * 1000000) {
      this.setState({ fileLoading: true, fileLoaded: true });

      try {
        const parsedFile = await readFile(incomingFile);
        events = parseICSFile(parsedFile.data);

        this.setState({
          allImportedEvents: events,
          selectedEvents: filterEvents(events),
          fileLoading: false,
          errorMessage: null,
          includePastEvents: false,
        });
      } catch (error) {
        console.log(errorMessage, error);
        this.setState({ errorMessage, fileLoading: false });
      }
    } else if (incomingFile && incomingFile.size > MAX_FILE_SIZE_MB * 1000000) {
      this.setState({ fileLoading: false, errorMessage });
    } else {
      this.setState({ fileLoading: false, errorMessage: null });
    }
  };

  onEventDelete = eventId => {
    this.setState(prevState => ({
      allImportedEvents: prevState.allImportedEvents.filter(event => event.event_id !== eventId),
      selectedEvents: prevState.selectedEvents.filter(event => event.event_id !== eventId),
    }));
  };

  onCheckboxToggle = e => {
    this.setState({
      includePastEvents: e.target.checked,
    });
  };

  handleEventsAdd = () => {
    const { allImportedEvents, selectedEvents, includePastEvents } = this.state;
    const eventsToImport = includePastEvents ? allImportedEvents : selectedEvents;

    const events = eventsToImport.map(event => ({
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time,
      event_id: event.event_id,
    }));

    this.props.addImportedEvents(events);
  };

  renderCallout = () => (
    <EuiCallOut color="danger">
      <p>{this.state.errorMessage}</p>
    </EuiCallOut>
  );

  render() {
    const { closeImportModal } = this.props;
    const {
      fileLoading,
      fileLoaded,
      allImportedEvents,
      selectedEvents,
      errorMessage,
      includePastEvents,
    } = this.state;

    let showRecurringWarning = false;
    let importedEvents;

    if (includePastEvents) {
      importedEvents = allImportedEvents;
    } else {
      importedEvents = selectedEvents;
    }

    if (importedEvents.find(e => e.asterisk) !== undefined) {
      showRecurringWarning = true;
    }

    return (
      <Fragment>
        <EuiModal onClose={closeImportModal} maxWidth={true}>
          <EuiModalHeader>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiModalHeaderTitle>
                  <FormattedMessage
                    id="xpack.ml.calendarsEdit.eventsTable.importEventsTitle"
                    defaultMessage="Import events"
                  />
                </EuiModalHeaderTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <p>
                  <FormattedMessage
                    id="xpack.ml.calendarsEdit.eventsTable.importEventsDescription"
                    defaultMessage="Import events from an ICS file."
                  />
                </p>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={false}>
                <EuiFilePicker
                  compressed
                  initialPromptText={i18n.translate(
                    'xpack.ml.calendarsEdit.importModal.selectOrDragAndDropFilePromptText',
                    {
                      defaultMessage: 'Select or drag and drop a file',
                    }
                  )}
                  onChange={this.handleImport}
                  disabled={fileLoading}
                />
              </EuiFlexItem>
              {errorMessage !== null && this.renderCallout()}
              {allImportedEvents.length > 0 && (
                <ImportedEvents
                  events={importedEvents}
                  showRecurringWarning={showRecurringWarning}
                  includePastEvents={includePastEvents}
                  onCheckboxToggle={this.onCheckboxToggle}
                  onEventDelete={this.onEventDelete}
                />
              )}
            </EuiFlexGroup>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeImportModal}>
              <FormattedMessage
                id="xpack.ml.calendarsEdit.eventsTable.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
            <EuiButton
              onClick={this.handleEventsAdd}
              fill
              disabled={fileLoaded === false || errorMessage !== null}
            >
              <FormattedMessage
                id="xpack.ml.calendarsEdit.eventsTable.importButtonLabel"
                defaultMessage="Import"
              />
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </Fragment>
    );
  }
}
