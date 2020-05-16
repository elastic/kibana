/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';

interface Props {
  viewRequests: () => void;
}

export function getBackgroundRunningNotification(props: Props) {
  return toMountPoint(<BackgroundRunningNotification viewRequests={props.viewRequests} />);
}

export function BackgroundRunningNotification(props: Props) {
  return (
    <div>
      <FormattedMessage
        id="xpack.data.search.backgroundRunningText"
        defaultMessage="You may navigate away from this page. We'll notify you when results are ready."
      />

      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton size="s" fill onClick={props.viewRequests}>
            <FormattedMessage id="xpack.data.search.viewRequests" defaultMessage="View Requests" />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
