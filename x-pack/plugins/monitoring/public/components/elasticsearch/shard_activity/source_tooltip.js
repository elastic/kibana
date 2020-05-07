/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiLink, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const SourceTooltip = ({ isCopiedFromPrimary, sourceTransportAddress, children }) => {
  if (!sourceTransportAddress) {
    return children;
  }

  const tipText = (
    <Fragment>
      {sourceTransportAddress}
      <br />
      <FormattedMessage
        id="xpack.monitoring.elasticsearch.shardActivity.sourceTooltip"
        defaultMessage="Copied from {copiedFrom} shard"
        values={{
          copiedFrom: isCopiedFromPrimary ? (
            <FormattedMessage
              id="xpack.monitoring.elasticsearch.shardActivity.sourceTooltip.primarySourceText"
              defaultMessage="primary"
            />
          ) : (
            <FormattedMessage
              id="xpack.monitoring.elasticsearch.shardActivity.sourceTooltip.replicaSourceText"
              defaultMessage="replica"
            />
          ),
        }}
      />
    </Fragment>
  );

  return (
    <EuiToolTip content={tipText} position="bottom">
      <EuiLink>{children}</EuiLink>
    </EuiToolTip>
  );
};
