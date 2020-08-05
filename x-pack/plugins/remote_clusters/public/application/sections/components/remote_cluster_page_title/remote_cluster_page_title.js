/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import { remoteClustersUrl } from '../../../services/documentation';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

export const RemoteClusterPageTitle = ({ title, description }) => (
  <Fragment>
    <EuiSpacer size="xs" />

    <EuiTitle size="l">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l" data-test-subj="remoteClusterPageTitle">
            <h1>{title}</h1>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={remoteClustersUrl}
            target="_blank"
            iconType="help"
            data-test-subj="remoteClusterDocsButton"
          >
            <FormattedMessage
              id="xpack.remoteClusters.readDocsButtonLabel"
              defaultMessage="Remote cluster docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiTitle>

    {description ? (
      <>
        <EuiSpacer size="s" />

        <EuiTitle size="s">
          <EuiText color="subdued">{description}</EuiText>
        </EuiTitle>
      </>
    ) : null}

    <EuiSpacer size="m" />
  </Fragment>
);

RemoteClusterPageTitle.propTypes = {
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
};
