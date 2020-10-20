/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { ListNodesRouteResponse } from '../../../../../../../../../common/types';
import { useLoadNodes } from '../../../../../../../services/api';

interface Props {
  children: (data: ListNodesRouteResponse) => JSX.Element;
}

export const NodesDataProvider = ({ children }: Props): JSX.Element => {
  const { isLoading, data, error, resendRequest } = useLoadNodes();

  if (isLoading) {
    return (
      <>
        <EuiLoadingSpinner size="xl" />
        <EuiSpacer size="m" />
      </>
    );
  }

  const renderError = () => {
    if (error) {
      const { statusCode, message } = error;
      return (
        <>
          <EuiCallOut
            style={{ maxWidth: 400 }}
            title={
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesLoadingFailedTitle"
                defaultMessage="Unable to load node attributes"
              />
            }
            color="danger"
          >
            <p>
              {message} ({statusCode})
            </p>
            <EuiButton onClick={resendRequest} iconType="refresh" color="danger">
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesReloadButton"
                defaultMessage="Try again"
              />
            </EuiButton>
          </EuiCallOut>

          <EuiSpacer size="xl" />
        </>
      );
    }
    return null;
  };

  return (
    <>
      {renderError()}
      {/* `data` will always be defined because we use an initial value when loading */}
      {children(data!)}
    </>
  );
};
