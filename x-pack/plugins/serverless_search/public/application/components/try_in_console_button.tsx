/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiButtonEmpty } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { compressToEncodedURIComponent } from 'lz-string';

import { useKibanaServices } from '../hooks/use_kibana';

export interface TryInConsoleButtonProps {
  request: string;
}
export const TryInConsoleButton = ({ request }: TryInConsoleButtonProps) => {
  const {
    application,
    share: { url },
  } = useKibanaServices();
  const canShowDevtools = !!application?.capabilities?.dev_tools?.show;
  if (!canShowDevtools || !url) return null;

  const devToolsDataUri = compressToEncodedURIComponent(request);
  const consolePreviewLink = url.locators.get('CONSOLE_APP_LOCATOR')?.useUrl(
    {
      loadFrom: `data:text/plain,${devToolsDataUri}`,
    },
    undefined,
    [request]
  );
  if (!consolePreviewLink) return null;

  return (
    <EuiButtonEmpty href={consolePreviewLink} iconType="popout" target="_blank">
      <FormattedMessage
        id="xpack.serverlessSearch.tryInConsoleButton"
        defaultMessage="Try in console"
      />
    </EuiButtonEmpty>
  );
};
