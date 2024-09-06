/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import { EuiConfirmModal, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';

import { CalendarsListHeader } from './header';
import { CalendarsListTable } from './table';
import { toastNotificationServiceProvider } from '../../../services/toast_notification_service';
import { mlNodesAvailable } from '../../../ml_nodes_check/check_ml_nodes';
import { deleteCalendars } from './delete_calendars';
import { i18n } from '@kbn/i18n';
import { withKibana } from '@kbn/kibana-react-plugin/public';
import { HelpMenu } from '../../../components/help_menu';

export class CalendarsListUI extends Component {
  static propTypes = {
    canCreateCalendar: PropTypes.bool.isRequired,
    canDeleteCalendar: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      calendars: [],
      isDestroyModalVisible: false,
      calendarId: null,
      selectedForDeletion: [],
      nodesAvailable: mlNodesAvailable(),
    };
  }

  loadCalendars = async () => {
    const mlApi = this.props.kibana.services.mlServices.mlApi;
    this.setState({ loading: true });

    try {
      const calendars = await mlApi.calendars();

      this.setState({
        calendars,
        loading: false,
        isDestroyModalVisible: false,
      });
    } catch (error) {
      console.log(error);
      this.setState({ loading: false });
      const { toasts } = this.props.kibana.services.notifications;
      toasts.addDanger(
        i18n.translate('xpack.ml.calendarsList.errorWithLoadingListOfCalendarsErrorMessage', {
          defaultMessage: 'An error occurred loading the list of calendars.',
        })
      );
      const toastNotificationService = toastNotificationServiceProvider(toasts);
      toastNotificationService.displayErrorToast(
        error,
        i18n.translate('xpack.ml.calendarsList.errorWithLoadingListOfCalendarsErrorMessage', {
          defaultMessage: 'An error occurred loading the list of calendars.',
        })
      );
    }
  };

  closeDestroyModal = () => {
    this.setState({ isDestroyModalVisible: false, calendarId: null });
  };

  showDestroyModal = () => {
    this.setState({ isDestroyModalVisible: true });
  };

  setSelectedCalendarList = (selectedCalendars) => {
    this.setState({ selectedForDeletion: selectedCalendars });
  };

  deleteCalendars = () => {
    const mlApi = this.props.kibana.services.mlServices.mlApi;
    const toasts = this.props.kibana.services.notifications.toasts;
    const { selectedForDeletion } = this.state;

    this.closeDestroyModal();
    deleteCalendars(mlApi, toasts, selectedForDeletion, this.loadCalendars);
  };

  addRequiredFieldsToList = (calendarsList = []) => {
    for (let i = 0; i < calendarsList.length; i++) {
      calendarsList[i].job_ids_string = calendarsList[i].job_ids.join(', ');
      calendarsList[i].events_length = calendarsList[i].events.length;
    }

    return calendarsList;
  };

  componentDidMount() {
    this.loadCalendars();
  }

  render() {
    const { calendars, selectedForDeletion, loading, nodesAvailable } = this.state;
    const { canCreateCalendar, canDeleteCalendar } = this.props;
    let destroyModal = '';

    const helpLink = this.props.kibana.services.docLinks.links.ml.calendars;

    if (this.state.isDestroyModalVisible) {
      destroyModal = (
        <EuiConfirmModal
          data-test-subj={'mlCalendarDeleteConfirmation'}
          title={i18n.translate(
            'xpack.ml.calendarsList.deleteCalendarsModal.deleteMultipleCalendarsTitle',
            {
              defaultMessage:
                'Delete {calendarsCount, plural, one {{calendarsList}} other {# calendars}}?',
              values: {
                calendarsCount: selectedForDeletion.length,
                calendarsList: selectedForDeletion.map((c) => c.calendar_id).join(', '),
              },
            }
          )}
          onCancel={this.closeDestroyModal}
          onConfirm={this.deleteCalendars}
          cancelButtonText={i18n.translate(
            'xpack.ml.calendarsList.deleteCalendarsModal.cancelButtonLabel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.ml.calendarsList.deleteCalendarsModal.deleteButtonLabel',
            { defaultMessage: 'Delete' }
          )}
          buttonColor="danger"
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        />
      );
    }

    return (
      <>
        <div data-test-subj="mlPageCalendarManagement">
          <CalendarsListHeader
            totalCount={calendars.length}
            refreshCalendars={this.loadCalendars}
          />
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
          {destroyModal}
        </div>
        <HelpMenu docLink={helpLink} />
      </>
    );
  }
}

export const CalendarsList = withKibana(CalendarsListUI);
