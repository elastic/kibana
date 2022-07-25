/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { shouldHandleLinkEvent } from '@kbn/observability-plugin/public';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export const AnalyzeInMlButton: React.FunctionComponent<{
  href?: string;
}> = ({ href }) => {
  const {
    services: { application },
  } = useKibanaContextForPlugin();

  const handleClick = useCallback(
    (e) => {
      if (!href || !shouldHandleLinkEvent(e)) return;
      application.navigateToUrl(href);
    },
    [href, application]
  );

  return (
    <EuiButton fill={false} size="s" onClick={handleClick}>
      <FormattedMessage
        id="xpack.infra.logs.analysis.analyzeInMlButtonLabel"
        defaultMessage="Analyze in ML"
      />
    </EuiButton>
  );
};
