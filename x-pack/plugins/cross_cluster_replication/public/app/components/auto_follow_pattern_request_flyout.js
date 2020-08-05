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

import { serializeAutoFollowPattern } from '../../../common/services/auto_follow_pattern_serialization';

export class AutoFollowPatternRequestFlyout extends PureComponent {
  static propTypes = {
    close: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired,
    autoFollowPattern: PropTypes.object.isRequired,
    isNew: PropTypes.bool,
  };

  render() {
    const { name, autoFollowPattern, close, isNew } = this.props;
    const endpoint = `PUT /_ccr/auto_follow/${name ? name : '<autoFollowPatternName>'}`;
    const payload = JSON.stringify(serializeAutoFollowPattern(autoFollowPattern), null, 2);
    const request = `${endpoint}\n${payload}`;

    return (
      <EuiFlyout maxWidth={480} onClose={close}>
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>
              {name ? (
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.requestFlyout.namedTitle"
                  defaultMessage="Request for '{name}'"
                  values={{ name }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.requestFlyout.unnamedTitle"
                  defaultMessage="Request"
                />
              )}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiText>
            <p>
              {isNew ? (
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.requestFlyout.createDescriptionText"
                  defaultMessage="This Elasticsearch request will create this auto-follow pattern."
                />
              ) : (
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternForm.requestFlyout.editDescriptionText"
                  defaultMessage="This Elasticsearch request will update this auto-follow pattern."
                />
              )}
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
              id="xpack.crossClusterReplication.autoFollowPatternForm.requestFlyout.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
