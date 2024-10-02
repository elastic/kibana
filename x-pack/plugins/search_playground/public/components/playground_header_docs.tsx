/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { docLinks } from '../../common/doc_links';

export const PlaygroundHeaderDocs: React.FC = () => (
  <EuiButtonEmpty
    data-telemetry-id="playground-header-documentationLink"
    data-test-subj="playground-documentation-link"
    href={docLinks.chatPlayground}
    target="_blank"
    iconType="documents"
    size="s"
  >
    {i18n.translate('xpack.searchPlayground.pageTitle.header.docLink', {
      defaultMessage: 'Playground Docs',
    })}
  </EuiButtonEmpty>
);
