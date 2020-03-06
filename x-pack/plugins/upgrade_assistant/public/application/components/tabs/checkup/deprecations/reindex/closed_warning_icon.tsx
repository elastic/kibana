/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiIcon, EuiToolTip, EuiText, EuiLink } from '@elastic/eui';
import { DocLinksStart } from 'src/core/public';

export interface Props {
  indexName: string;
  docLinks: DocLinksStart;
}

export const ReindexClosedWarningIcon: FunctionComponent<Props> = ({
  indexName,
  docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
}) => (
  <EuiToolTip
    position="top"
    content={
      <EuiText size="s">
        {`"${indexName}" needs to be reindexed, but it is currently closed. The Upgrade Assistant will open,`}
        {` reindex and then close the index. Reindexing may take longer than usual.`}
      </EuiText>
    }
  >
    <EuiLink
      target="_blank"
      href={`${ELASTIC_WEBSITE_URL}/guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/indices-open-close.html`}
    >
      <EuiIcon color="warning" type="alert" />
    </EuiLink>
  </EuiToolTip>
);
