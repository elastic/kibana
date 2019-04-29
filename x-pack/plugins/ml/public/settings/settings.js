/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import { PropTypes } from 'prop-types';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageContentHeader,
  EuiPageContent,
  EuiPageBody,
  EuiTitle
} from '@elastic/eui';

import chrome from 'ui/chrome';

import { FormattedMessage } from '@kbn/i18n/react';

export function Settings({
  canGetFilters,
  canGetCalendars
}) {
  return (
    <EuiPage className="mlSettingsPage">
      <EuiPageBody className="mlSettingsPage__body">
        <EuiPageContent
          className="mlSettingsPage__content"
          horizontalPosition="center"
        >
          <EuiPageContentHeader>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.ml.settings.jobManagementTitle"
                  defaultMessage="Job Management"
                />
              </h2>
            </EuiTitle>
          </EuiPageContentHeader>

          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-testid="ml_calendar_mng_button"
                size="l"
                color="primary"
                href={`${chrome.getBasePath()}/app/ml#/settings/calendars_list`}
                isDisabled={canGetCalendars === false}
              >
                <FormattedMessage
                  id="xpack.ml.settings.calendarManagementButtonLabel"
                  defaultMessage="Calendar management"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-testid="ml_filter_lists_button"
                size="l"
                color="primary"
                href={`${chrome.getBasePath()}/app/ml#/settings/filter_lists`}
                isDisabled={canGetFilters === false}
              >
                <FormattedMessage
                  id="xpack.ml.settings.filterListsButtonLabel"
                  defaultMessage="Filter Lists"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>

        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}

Settings.propTypes = {
  canGetFilters: PropTypes.bool.isRequired,
  canGetCalendars: PropTypes.bool.isRequired,
};
