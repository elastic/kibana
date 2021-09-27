/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLink, EuiPanel, EuiSwitch, EuiSpacer, EuiText } from '@elastic/eui';

import { ViewContentHeader } from '../../../../components/shared/view_content_header';
import { NAV } from '../../../../constants';
import { SYNCHRONIZATION_DOCS_URL } from '../../../../routes';
import {
  SOURCE_SYNCRONIZATION_DESCRIPTION,
  SOURCE_SYNCRONIZATION_TOGGLE_LABEL,
  SOURCE_SYNCRONIZATION_TOGGLE_DESCRIPTION,
  SYNCHRONIZATION_LINK_LABEL,
} from '../../constants';
import { SourceLayout } from '../source_layout';

export const Synchronization: React.FC = () => {
  const onChange = (checked: boolean) => `#TODO: ${checked}`;

  return (
    <SourceLayout
      pageChrome={[NAV.SYNCHRONIZATION]}
      pageViewTelemetry="source_synchronization"
      isLoading={false}
    >
      <ViewContentHeader
        title={NAV.SYNCHRONIZATION}
        description={SOURCE_SYNCRONIZATION_DESCRIPTION}
      />
      <EuiLink href={SYNCHRONIZATION_DOCS_URL} external>
        {SYNCHRONIZATION_LINK_LABEL}
      </EuiLink>
      <EuiSpacer />
      <EuiPanel hasBorder>
        <EuiSwitch
          label={SOURCE_SYNCRONIZATION_TOGGLE_LABEL}
          checked
          onChange={(e) => onChange(e.target.checked)}
        />
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          {SOURCE_SYNCRONIZATION_TOGGLE_DESCRIPTION}
        </EuiText>
      </EuiPanel>
    </SourceLayout>
  );
};
