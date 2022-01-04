/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';
import { remoteClustersUrl } from '../../../services/documentation';

import { EuiPageHeader, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

export const RemoteClusterPageTitle = ({ title, description }) => (
  <>
    <EuiPageHeader
      bottomBorder
      pageTitle={<span data-test-subj="remoteClusterPageTitle">{title}</span>}
      rightSideItems={[
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
        </EuiButtonEmpty>,
      ]}
      description={description}
    />

    <EuiSpacer size="l" />
  </>
);

RemoteClusterPageTitle.propTypes = {
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
};
