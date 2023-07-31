/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { transform, isObject, isEmpty, isNull } from 'lodash';

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

import { Cluster, serializeCluster } from '../../../../../common/lib';

// Remove all null properties from an object
export function removeNullProperties(obj: any) {
  return transform(obj, (result: any, value, key) => {
    if (isObject(value)) {
      result[key] = removeNullProperties(value);
      if (isEmpty(result[key])) {
        delete result[key];
      }
    } else if (!isNull(value)) {
      result[key] = value;
    }
  });
}

interface Props {
  close: () => void;
  cluster: Cluster;
}

export class RequestFlyout extends PureComponent<Props> {
  render() {
    const { close, cluster } = this.props;
    const { name } = cluster;
    const endpoint = 'PUT _cluster/settings';
    // Given that the request still requires that we send all properties, regardless of whether they
    // are null, we need to remove all null properties from the serialized cluster object that we
    // render in the flyout.
    const serializedCluster = removeNullProperties(serializeCluster(cluster));
    const payload = JSON.stringify(serializedCluster, null, 2);
    const request = `${endpoint}\n${payload}`;

    return (
      <EuiFlyout maxWidth={480} onClose={close}>
        <EuiFlyoutHeader>
          <EuiTitle data-test-subj="remoteClusterRequestFlyoutTitle">
            <h2>
              {name ? (
                <FormattedMessage
                  id="xpack.remoteClusters.requestFlyout.namedTitle"
                  defaultMessage="Request for '{name}'"
                  values={{ name }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.remoteClusters.requestFlyout.unnamedTitle"
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
                id="xpack.remoteClusters.requestFlyout.descriptionText"
                defaultMessage="This Elasticsearch request will create or update this remote cluster."
              />
            </p>
          </EuiText>

          <EuiSpacer />

          <EuiCodeBlock language="json" isCopyable data-test-subj="esRequestBody">
            {request}
          </EuiCodeBlock>
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiButtonEmpty iconType="cross" onClick={close} flush="left">
            <FormattedMessage
              id="xpack.remoteClusters.requestFlyout.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
