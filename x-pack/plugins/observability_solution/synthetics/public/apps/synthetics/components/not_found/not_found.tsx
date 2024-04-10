/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const NOT_FOUND_TITLE = i18n.translate('xpack.synthetics.notFoundTitle', {
  defaultMessage: 'Page not found',
});

const NOT_FOUND_BODY = i18n.translate('xpack.synthetics.notFoundBody', {
  defaultMessage:
    "Sorry, we can't find the page you're looking for. It might have been removed or renamed, or maybe it never existed.",
});

/**
 * Renders a "Page not found" error.
 *
 * @deprecated This component must be moved to Kibana/Shared UX. It was created
 * as a temporary solution to move #144366 forward but it should not be used.
 */
export function NotFound(): JSX.Element {
  return (
    <EuiEmptyPrompt
      layout="vertical"
      color="subdued"
      titleSize="m"
      iconType="questionInCircle"
      iconColor="primary"
      title={<h2>{NOT_FOUND_TITLE}</h2>}
      body={<p>{NOT_FOUND_BODY}</p>}
    />
  );
}
