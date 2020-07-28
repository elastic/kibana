/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { PropTypes } from 'prop-types';

import {
  EuiConfirmModal,
  EuiOverlayMask,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { NavigationMenu } from '../../../components/navigation_menu';
import { CalendarsListHeader } from './header';
import { CalendarsListTable } from './table';
import { ml } from '../../../services/ml_api_service';
import { mlNodesAvailable } from '../../../ml_nodes_check/check_ml_nodes';
import { deleteCalendars } from './delete_calendars';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { withKibana } from '../../../../../../../../src/plugins/kibana_react/public';

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
    this.setState({ loading: true });

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
      const { toasts } = this.props.kibana.services.notifications;
      toasts.addDanger(
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
    const { selectedForDeletion } = this.state;

    this.closeDestroyModal();
    deleteCalendars(selectedForDeletion, this.loadCalendars);
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

    if (this.state.isDestroyModalVisible) {
      destroyModal = (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={
              <FormattedMessage
                id="xpack.ml.calendarsList.deleteCalendarsModal.deleteCalendarTitle"
                defaultMessage="Delete calendar"
              />
            }
            onCancel={this.closeDestroyModal}
            onConfirm={this.deleteCalendars}
            cancelButtonText={
              <FormattedMessage
                id="xpack.ml.calendarsList.deleteCalendarsModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            }
            confirmButtonText={
              <FormattedMessage
                id="xpack.ml.calendarsList.deleteCalendarsModal.deleteButtonLabel"
                defaultMessage="Delete"
              />
            }
            buttonColor="danger"
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
          >
            <p>
              <FormattedMessage
                id="xpack.ml.calendarsList.deleteCalendarsModal.deleteCalendarsDescription"
                defaultMessage="Delete {calendarsCount, plural, one {this calendar} other {these calendars}}? {calendarsList}"
                values={{
                  calendarsCount: selectedForDeletion.length,
                  calendarsList: selectedForDeletion.map((c) => c.calendar_id).join(', '),
                }}
              />
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      );
    }

    return (
      <Fragment>
        <NavigationMenu tabId="settings" />
        <EuiPage className="mlCalendarList">
          <EuiPageBody>
            <EuiPageContent
              className="mlCalendarList__content"
              verticalPosition="center"
              horizontalPosition="center"
            >
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
            </EuiPageContent>
            {destroyModal}
          </EuiPageBody>
        </EuiPage>
      </Fragment>
    );
  }
}

export const CalendarsList = withKibana(CalendarsListUI);
