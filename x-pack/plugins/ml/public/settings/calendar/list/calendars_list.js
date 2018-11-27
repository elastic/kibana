/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React, {
  Component
} from 'react';

import {
  EuiConfirmModal,
  EuiOverlayMask,
  EuiPage,
  EuiPageContent,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { CalendarsListTable } from './table';
import { ml } from '../../../services/ml_api_service';

// TODO: add error handling for calendars load
export class CalendarsList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      calendars: [],
      isDestroyModalVisible: false,
      calendarId: null,
    };
  }

  loadCalendars = () => {
    ml.calendars()
      .then((resp) => {
        this.setState({
          calendars: resp,
          loading: false,
          isDestroyModalVisible: false,
        });
      })
      .catch((error) => {
        console.log(error);
      });
  }

  closeDestroyModal = () => {
    this.setState({ isDestroyModalVisible: false, calendarId: null });
  }

  showDestroyModal = (calendarId) => {
    this.setState({ isDestroyModalVisible: true, calendarId });
  }

  // TODO: handle error of calendar delete - toast with message
  deleteCalendar = () => {
    const { calendarId } = this.state;

    ml.deleteCalendar({ calendarId })
      .then(() => {
        this.loadCalendars();
      })
      .catch((error) => {
        this.closeDestroyModal();
        console.log(error);
      });
  }

  // TODO: check if events and job_ids always array
  addRequiredFieldsToList = (calendarsList) => {
    for (let i = 0; i < calendarsList.length; i++) {
      const eventLength = calendarsList[i].events.length;
      calendarsList[i].job_ids_string = calendarsList[i].job_ids.join(', ');
      calendarsList[i].events_length = `${eventLength} ${eventLength === 1 ? 'event' : 'events'}`;
    }

    return calendarsList;
  }

  componentDidMount() {
    this.loadCalendars();
  }

  render() {
    const { calendars, calendarId } = this.state;
    let destroyModal = '';

    if (this.state.isDestroyModalVisible) {
      destroyModal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            title="Delete calendar"
            onCancel={this.closeDestroyModal}
            onConfirm={this.deleteCalendar}
            cancelButtonText="Cancel"
            confirmButtonText="OK"
            buttonColor="danger"
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
          >
            <p>{`Confirm deletion of ${calendarId}?`}</p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      );
    }

    return (
      <EuiPage className="ml-list-filter-lists">
        <EuiPageContent
          className="ml-list-filter-lists-content"
          verticalPosition="center"
          horizontalPosition="center"
        >
          <CalendarsListTable
            calendarsList={this.addRequiredFieldsToList(calendars)}
            onDeleteClick={this.showDestroyModal}
          />
        </EuiPageContent>
        {destroyModal}
      </EuiPage>
    );
  }
}
