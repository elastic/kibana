/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import PropTypes from 'prop-types';

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

import { serializeFollowerIndex } from '../../../../common/services/follower_index_serialization';

export class FollowerIndexRequestFlyout extends PureComponent {
  static propTypes = {
    close: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired,
    followerIndex: PropTypes.object.isRequired,
  };

  render() {
    const { name, followerIndex, close } = this.props;
    const endpoint = `PUT /${name ? name : '<followerIndexName>'}/_ccr/follow`;
    const payload = JSON.stringify(serializeFollowerIndex(followerIndex), null, 2);
    const request = `${endpoint}\n${payload}`;

    return (
      <EuiFlyout maxWidth={480} onClose={close}>
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexForm.requestFlyout.title"
                defaultMessage="Request"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexForm.requestFlyout.descriptionText"
                defaultMessage="This Elasticsearch request will create this follower index."
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
              id="xpack.crossClusterReplication.followerIndexForm.requestFlyout.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
