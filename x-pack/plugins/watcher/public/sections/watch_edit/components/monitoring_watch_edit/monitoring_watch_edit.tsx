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
import { i18n } from '@kbn/i18n';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { WatchContext } from '../../watch_context';

const MonitoringWatchEditUi = ({ pageTitle }: { pageTitle: string }) => {
  const { watch } = useContext(WatchContext);

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
      <EuiCallOut
        title={i18n.translate('xpack.watcher.sections.watchEdit.monitoring.calloutTitleText', {
          defaultMessage: 'This watch cannot be edited.',
        })}
        iconType="pin"
      >
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.watcher.sections.watchEdit.monitoring.header"
              defaultMessage="Watch '{watchName}' is a system watch and cannot be edited. {watchStatusLink}"
              values={{
                watchName: watch.name,
                watchStatusLink: (
                  <EuiLink
                    href={`#/management/elasticsearch/watcher/watches/watch/${watch.id}/status`}
                  >
                    <FormattedMessage
                      id="xpack.watcher.sections.watchEdit.monitoring.header.watchLinkTitle"
                      defaultMessage="View watch status."
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiCallOut>
    </EuiPageContent>
  );
};

export const MonitoringWatchEdit = injectI18n(MonitoringWatchEditUi);
