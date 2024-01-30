/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIsolateHostPanelContext } from './context';
import { FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';
import { FlyoutHeader } from '../../shared/components/flyout_header';

/**
 * Document details expandable right section header for the isolate host panel
 */
export const PanelHeader: FC = () => {
  const { isolateAction } = useIsolateHostPanelContext();

  const title =
    isolateAction === 'isolateHost' ? (
      <FormattedMessage
        id="xpack.securitySolution.flyout.isolateHost.isolateTitle"
        defaultMessage="Isolate host"
      />
    ) : (
      <FormattedMessage
        id="xpack.securitySolution.flyout.isolateHost.releaseTitle"
        defaultMessage="Release host"
      />
    );

  return (
    <FlyoutHeader>
      <EuiTitle size="s">
        <h4 data-test-subj={FLYOUT_HEADER_TITLE_TEST_ID}>{title}</h4>
      </EuiTitle>
    </FlyoutHeader>
  );
};
