/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCodeBlock,
} from '@elastic/eui';
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

  const errorContent = getErrorContent(error);
  const title = titleOverride ? titleOverride : errorContent.title;

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
          {messageOverride ? <p>{messageOverride}</p> : errorContent.body}
          <EuiFlexGroup justifyContent="center">
            {hasDetailsModal && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="hostsViewErrorDetailsButton"
                  onClick={openDetails}
                  color="danger"
                >
                  <FormattedMessage
                    id="xpack.infra.hostsViewPage.error.detailsButton"
                    defaultMessage="Error details"
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

const getErrorContent = (error: Error): { title: string; body: JSX.Element } => {
  if (error instanceof KQLSyntaxError) {
    return {
      title: i18n.translate('xpack.infra.hostsViewPage.error.kqlErrorTitle', {
        defaultMessage: 'Invalid KQL expression',
      }),
      body: (
        <>
          <FormattedMessage
            id="xpack.infra.hostsViewPage.error.kqlErrorMessage"
            defaultMessage="We can't show any results because we couldn't apply your filter."
          />
          <EuiSpacer size="s" />
          <EuiCodeBlock transparentBackground paddingSize="s">
            {error.message}
          </EuiCodeBlock>
        </>
      ),
    };
  }

  return {
    title: i18n.translate('xpack.infra.hostsViewPage.error.unknownErrorTitle', {
      defaultMessage: 'An error occurred',
    }),
    body: <>{error.message}</>,
  };
};
