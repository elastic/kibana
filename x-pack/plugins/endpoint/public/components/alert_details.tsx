/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { EuiPage, EuiTitle, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { RouteComponentProps } from 'react-router';
import { AppMountContext, AppMountParameters } from 'kibana/public';

export const AlertDetails = ({
  context,
  history,
  match,
}: { context: AppMountContext } & RouteComponentProps<{ alertId: string }>) => {
  interface AlertDetailsData {
    alertData: object | null;
  }
  const [data, setData]: [AlertDetailsData, any] = useState({
    alertData: null,
  });

  async function fetchAlertListData() {
    const response = await context.core.http.get('/alerts/' + match.params.alertId, {});
    setData({
      alertData: response.elasticsearchResponse.hits.hits[0],
    });
  }

  useEffect(() => {
    fetchAlertListData();
  }, [match.params.alertId]);

  function closeFlyout() {
    history.push('/alerts');
  }

  function processName() {
    const { alertData } = data;
    const targetProcess = alertData._source.endgame.data.alert_details.target_process;
    if (targetProcess) {
      return targetProcess.name;
    }
    return null;
  }

  const { alertData } = data;
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
