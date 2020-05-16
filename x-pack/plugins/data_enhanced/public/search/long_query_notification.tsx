/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';

interface Props {
  cancel: () => void;
  runBeyondTimeout: () => void;
}

export function getLongQueryNotification(props: Props) {
  return toMountPoint(
    <LongQueryNotification cancel={props.cancel} runBeyondTimeout={props.runBeyondTimeout} />
  );
}

export function LongQueryNotification(props: Props) {
  return (
    <div>
      <FormattedMessage
        id="xpack.data.search.longSearchText"
        defaultMessage="This request will timeout shortly. You can instead choose to run it in the background to completion, regardless if you stay on the page."
      />

      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" onClick={props.cancel}>
            <FormattedMessage id="xpack.data.search.cancelLongQuery" defaultMessage="Cancel" />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" fill onClick={props.runBeyondTimeout}>
            <FormattedMessage
              id="xpack.data.search.runBackground"
              defaultMessage="Send to Background"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
