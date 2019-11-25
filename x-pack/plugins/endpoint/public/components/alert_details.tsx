/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { EuiTitle, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import * as alertDetailsSelectors from '../selectors/alert_details';
import { actions as alertDetailsActions } from '../actions/alert_details';

export const AlertDetails = () => {
  const dispatch = useDispatch();
  const alertData = useSelector(alertDetailsSelectors.alertDetailsData);

  function closeFlyout() {
    dispatch(alertDetailsActions.userClosedAlertDetailsFlyout());
  }

  function processName() {
    const targetProcess = alertData._source.endgame.data.alert_details.target_process;
    if (targetProcess) {
      return targetProcess.name;
    }
    return null;
  }

  const DetailsTable = styled.table`
    td {
      padding-right: 10px;
      &.field {
        font-weight: bold;
      }
    }
  `;

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">Alert Details</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {alertData !== null && (
          <DetailsTable>
            <tbody>
              <tr>
                <td className="field">Timestamp:</td>
                <td>{alertData._source.endgame.timestamp_utc}</td>
              </tr>
              <tr>
                <td className="field">Process Name:</td>
                <td>{processName()}</td>
              </tr>
              <tr>
                <td className="field">Host:</td>
                <td>{alertData._source.host.hostname}</td>
              </tr>
              <tr>
                <td className="field">Operating System:</td>
                <td>{alertData._source.host.os.name}</td>
              </tr>
              <tr>
                <td className="field">IP:</td>
                <td>{alertData._source.host.ip}</td>
              </tr>
            </tbody>
          </DetailsTable>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
