/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

interface Props {
  id: any;
  close: any;
  payload: any;
}

export class RequestFlyout extends PureComponent<Props> {
  getEsJson(payload: any): string {
    return JSON.stringify(payload, null, 2);
  }

  render() {
    const { id, payload, close } = this.props;
    const endpoint = `PUT _watcher/watch/${id || '<watchId>'}`;
    const request = `${endpoint}\n${this.getEsJson(payload)}`;

    return (
      <EuiFlyout maxWidth={480} onClose={close}>
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>
              {id ? (
                <FormattedMessage
                  id="xpack.watcher.requestFlyout.namedTitle"
                  defaultMessage="Request for '{id}'"
                  values={{ id }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.watcher.requestFlyout.unnamedTitle"
                  defaultMessage="Request"
                />
              )}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.watcher.requestFlyout.descriptionText"
                defaultMessage="This Elasticsearch request will create or update this watch."
              />
            </p>
          </EuiText>

          <EuiSpacer />

          <EuiCodeBlock language="json" isCopyable>
            {request}
          </EuiCodeBlock>
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiButtonEmpty iconType="cross" onClick={close} flush="left">
            <FormattedMessage
              id="xpack.watcher.requestFlyout.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
