/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiPageTemplate,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import {
  FetchLogSourceConfigurationError,
  FetchLogSourceStatusError,
  PatchLogSourceConfigurationError,
  ResolveLogSourceConfigurationError,
} from '../../../common/log_sources';
import { useLinkProps } from '../../hooks/use_link_props';

export const LogSourceErrorPage: React.FC<{
  errors: Error[];
  onRetry: () => void;
}> = ({ errors, onRetry }) => {
  const settingsLinkProps = useLinkProps({ app: 'logs', pathname: '/settings' });

  return (
    <EuiPageTemplate template="centeredBody" pageContentProps={{ paddingSize: 'none' }}>
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.infra.logSourceErrorPage.failedToLoadSourceTitle"
              defaultMessage="Failed to load configuration"
            />
          </h2>
        }
        body={
          <>
            <p>
              <FormattedMessage
                id="xpack.infra.logSourceErrorPage.failedToLoadSourceMessage"
                defaultMessage="Errors occurred while attempting to load the configuration. Try again or change the configuration to fix the problem."
              />
            </p>
            {errors.map((error) => (
              <LogSourceErrorMessage error={error} />
            ))}
          </>
        }
        actions={[
          <EuiButton onClick={onRetry} iconType="refresh" fill>
            <FormattedMessage
              id="xpack.infra.logSourceErrorPage.tryAgainButtonLabel"
              defaultMessage="Try again"
            />
          </EuiButton>,
          <EuiButtonEmpty iconType="gear" {...settingsLinkProps}>
            <FormattedMessage
              id="xpack.infra.logSourceErrorPage.navigateToSettingsButtonLabel"
              defaultMessage="Change configuration"
            />
          </EuiButtonEmpty>,
        ]}
      />
    </EuiPageTemplate>
  );
};

const LogSourceErrorMessage: React.FC<{ error: Error }> = ({ error }) => {
  if (error instanceof FetchLogSourceConfigurationError) {
    return <EuiCodeBlock key={error.name} className="eui-textLeft">{`${error}`}</EuiCodeBlock>;
  } else if (error instanceof PatchLogSourceConfigurationError) {
    return <EuiCodeBlock key={error.name} className="eui-textLeft">{`${error}`}</EuiCodeBlock>;
  } else if (error instanceof FetchLogSourceStatusError) {
    return <EuiCodeBlock key={error.name} className="eui-textLeft">{`${error}`}</EuiCodeBlock>;
  } else if (error instanceof ResolveLogSourceConfigurationError) {
    return <EuiCodeBlock key={error.name} className="eui-textLeft">{`${error}`}</EuiCodeBlock>;
  } else {
    return <EuiCodeBlock key={error.name} className="eui-textLeft">{`${error}`}</EuiCodeBlock>;
  }
};
