/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';

import { EuiPageContent, EuiEmptyPrompt, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { WatchContext } from '../../watch_context';
import { useAppContext } from '../../../../app_context';

export const MonitoringWatchEdit = ({ pageTitle }: { pageTitle: string }) => {
  const { watch } = useContext(WatchContext);
  const { history } = useAppContext();

  const systemWatchMessage = (
    <FormattedMessage
      id="xpack.watcher.sections.watchEdit.monitoring.edit.calloutDescriptionText"
      defaultMessage="Watch '{watchName}' is a system watch and cannot be edited."
      values={{
        watchName: watch.name,
      }}
    />
  );

  return (
    <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
      <EuiEmptyPrompt
        iconType=""
        title={<h1>{pageTitle}</h1>}
        body={<p>{systemWatchMessage}</p>}
        actions={[
          <EuiLink {...reactRouterNavigate(history, `/watches/watch/${watch.id}/status`)}>
            <FormattedMessage
              id="xpack.watcher.sections.watchEdit.monitoring.header.watchLinkTitle"
              defaultMessage="View watch status"
            />
          </EuiLink>,
        ]}
      />
    </EuiPageContent>
  );
};
