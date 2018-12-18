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

import { CalendarsListTable } from './table/';
import { ml } from '../../../services/ml_api_service';
import { toastNotifications } from 'ui/notify';
import { checkPermission } from '../../../privilege/check_privilege';
import { mlNodesAvailable } from '../../../ml_nodes_check/check_ml_nodes';
import { deleteCalendars } from './delete_calendars';

export class CalendarsList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      calendars: [],
      isDestroyModalVisible: false,
      calendarId: null,
      selectedForDeletion: [],
      canCreateCalendar: checkPermission('canCreateCalendar'),
      canDeleteCalendar: checkPermission('canDeleteCalendar'),
      nodesAvailable: mlNodesAvailable()
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
      toastNotifications.addDanger('An error occurred loading the list of calendars.');
    }
  }

  closeDestroyModal = () => {
    this.setState({ isDestroyModalVisible: false, calendarId: null });
  }

  showDestroyModal = () => {
    this.setState({ isDestroyModalVisible: true });
  }

  setSelectedCalendarList = (selectedCalendars) => {
    this.setState({ selectedForDeletion: selectedCalendars });
  }

  deleteCalendars = () => {
    const { selectedForDeletion } = this.state;

    this.closeDestroyModal();
    deleteCalendars(selectedForDeletion, this.loadCalendars);
  }

  addRequiredFieldsToList = (calendarsList = []) => {
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
    const {
      calendars,
      selectedForDeletion,
      loading,
      canCreateCalendar,
      canDeleteCalendar,
      nodesAvailable
    } = this.state;
    let destroyModal = '';

    if (this.state.isDestroyModalVisible) {
      destroyModal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            title="Delete calendar"
            onCancel={this.closeDestroyModal}
            onConfirm={this.deleteCalendars}
            cancelButtonText="Cancel"
            confirmButtonText="Delete"
            buttonColor="danger"
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
          >
            <p>
              {
                `Delete ${selectedForDeletion.length === 1 ? 'this' : 'these'}
                calendar${selectedForDeletion.length === 1 ? '' : 's'}?
                ${selectedForDeletion.map((c) => c.calendar_id).join(', ')}`
              }
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      );
    }

    return (
      <EuiPage className="mlCalendarList">
        <EuiPageContent
          className="mlCalendarList__content"
          verticalPosition="center"
          horizontalPosition="center"
        >
          <CalendarsListTable
            loading={loading}
            calendarsList={this.addRequiredFieldsToList(calendars)}
            onDeleteClick={this.showDestroyModal}
            canCreateCalendar={canCreateCalendar}
            canDeleteCalendar={canDeleteCalendar}
            mlNodesAvailable={nodesAvailable}
            setSelectedCalendarList={this.setSelectedCalendarList}
            itemsSelected={selectedForDeletion.length > 0}
          />
        </EuiPageContent>
        {destroyModal}
      </EuiPage>
    );
  }
}
