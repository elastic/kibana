/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent,
  EuiSpacer,
  EuiTitle,
  EuiCallOut,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { WatchContext } from '../../watch_context';

export const MonitoringWatchEdit = ({ pageTitle }: { pageTitle: string }) => {
  const { watch } = useContext(WatchContext);

  const systemWatchTitle = (
    <FormattedMessage
      id="xpack.watcher.sections.watchEdit.monitoring.edit.calloutTitleText"
      defaultMessage="This watch cannot be edited."
    />
  );

  const systemWatchMessage = (
    <FormattedMessage
      id="xpack.watcher.sections.watchEdit.monitoring.edit.calloutDescriptionText"
      defaultMessage="Watch '{watchName}' is a system watch and cannot be edited. {watchStatusLink}"
      values={{
        watchName: watch.name,
        watchStatusLink: (
          <EuiLink href={`#/management/elasticsearch/watcher/watches/watch/${watch.id}/status`}>
            <FormattedMessage
              id="xpack.watcher.sections.watchEdit.monitoring.header.watchLinkTitle"
              defaultMessage="View watch status."
            />
          </EuiLink>
        ),
      }}
    />
  );

  return (
    <EuiPageContent>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h1>{pageTitle}</h1>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiCallOut title={systemWatchTitle} iconType="pin">
        <EuiText>
          <p>{systemWatchMessage}</p>
        </EuiText>
      </EuiCallOut>
    </EuiPageContent>
  );
};
