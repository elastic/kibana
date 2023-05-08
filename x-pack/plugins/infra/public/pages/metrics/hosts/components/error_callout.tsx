/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { KQLSyntaxError } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';

interface Props {
  error: Error;
  titleOverride?: string;
  messageOverride?: string;
  hasDetailsModal?: boolean;
  hasTryAgainButton?: boolean;
  onTryAgainClick?: () => void;
}

export const ErrorCallout = ({
  error,
  titleOverride,
  messageOverride,
  hasDetailsModal = false,
  hasTryAgainButton = false,
  onTryAgainClick,
}: Props) => {
  const {
    services: { notifications },
  } = useKibanaContextForPlugin();

  const title = titleOverride ? titleOverride : getErrorTitle(error);

  const openDetails = () => {
    notifications.showErrorDialog({ title, error });
  };

  return (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      title={<h2>{title}</h2>}
      data-test-subj="hostsViewErrorCallout"
      body={
        <>
          <p>{messageOverride ?? error.message}</p>
          <EuiFlexGroup justifyContent="center">
            {hasDetailsModal && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="hostsViewErrorDetailsButton"
                  onClick={openDetails}
                  color="danger"
                >
                  <FormattedMessage
                    id="xpack.infra.hostsViewPage.error.showDetailsButton"
                    defaultMessage="Show details"
                  />
                </EuiButton>
              </EuiFlexItem>
            )}
            {hasTryAgainButton && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="hostsViewTryAgainButton"
                  onClick={onTryAgainClick}
                  iconType="refresh"
                  color="danger"
                >
                  <FormattedMessage
                    id="xpack.infra.hostsViewPage.error.tryAgainButton"
                    defaultMessage="Try again"
                  />
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      }
    />
  );
};

const getErrorTitle = (error: Error) => {
  if (error instanceof KQLSyntaxError) {
    return i18n.translate('xpack.infra.hostsViewPage.error.kqlErrorTitle', {
      defaultMessage: 'Invalid KQL expression',
    });
  }

  return i18n.translate('xpack.infra.hostsViewPage.error.unknownErrorTitle', {
    defaultMessage: 'An Error Occurred',
  });
};
