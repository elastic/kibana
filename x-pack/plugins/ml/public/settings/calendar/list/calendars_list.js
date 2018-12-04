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
import { toastNotifications } from 'ui/notify';

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

  loadCalendars = async () => {
    try {
      const calendars = await ml.calendars();

      this.setState({
        calendars,
        loading: false,
        isDestroyModalVisible: false,
      });
    } catch (error) {
      console.log(error);
      this.setState({ loading: false });
      toastNotifications.addDanger('An error occurred loading calendar list.');
    }
  }

  closeDestroyModal = () => {
    this.setState({ isDestroyModalVisible: false, calendarId: null });
  }

  showDestroyModal = (calendarId) => {
    this.setState({ isDestroyModalVisible: true, calendarId });
  }

  deleteCalendar = async () => {
    const { calendarId } = this.state;

    try {
      await ml.deleteCalendar({ calendarId });
      this.loadCalendars();
    } catch (error) {
      console.log(error);
      this.closeDestroyModal();
      toastNotifications.addDanger(`An error occurred deleting calendar: ${calendarId}`);
    }
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
    const { calendars, calendarId, loading } = this.state;
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
      <EuiPage className="ml-list-calendar">
        <EuiPageContent
          className="ml-list-calendar-content"
          verticalPosition="center"
          horizontalPosition="center"
        >
          <CalendarsListTable
            loading={loading}
            calendarsList={this.addRequiredFieldsToList(calendars)}
            onDeleteClick={this.showDestroyModal}
          />
        </EuiPageContent>
        {destroyModal}
      </EuiPage>
    );
  }
}
