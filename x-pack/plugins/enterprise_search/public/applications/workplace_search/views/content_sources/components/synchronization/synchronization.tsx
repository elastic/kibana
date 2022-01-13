/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiCallOut, EuiLink, EuiPanel, EuiSwitch, EuiSpacer, EuiText } from '@elastic/eui';

import { docLinks } from '../../../../../shared/doc_links';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';
import { NAV } from '../../../../constants';
import {
  LEARN_MORE_LINK,
  SOURCE_SYNCHRONIZATION_DESCRIPTION,
  SYNCHRONIZATION_DISABLED_TITLE,
  SYNCHRONIZATION_DISABLED_DESCRIPTION,
  SOURCE_SYNCHRONIZATION_TOGGLE_LABEL,
  SOURCE_SYNCHRONIZATION_TOGGLE_DESCRIPTION,
} from '../../constants';
import { SourceLogic } from '../../source_logic';
import { SourceLayout } from '../source_layout';

import { SynchronizationLogic } from './synchronization_logic';

export const Synchronization: React.FC = () => {
  const { contentSource } = useValues(SourceLogic);
  const { updateSyncEnabled } = useActions(SynchronizationLogic({ contentSource }));

  const {
    isSyncConfigEnabled,
    indexing: { enabled },
  } = contentSource;

  const onChange = (checked: boolean) => updateSyncEnabled(checked);
  const syncToggle = (
    <EuiPanel hasBorder>
      <EuiSwitch
        label={SOURCE_SYNCHRONIZATION_TOGGLE_LABEL}
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        {SOURCE_SYNCHRONIZATION_TOGGLE_DESCRIPTION}
      </EuiText>
    </EuiPanel>
  );

  const syncDisabledCallout = (
    <EuiCallOut title={SYNCHRONIZATION_DISABLED_TITLE} color="warning" iconType="help">
      <p>{SYNCHRONIZATION_DISABLED_DESCRIPTION}</p>
    </EuiCallOut>
  );

  return (
    <SourceLayout
      pageChrome={[NAV.SYNCHRONIZATION]}
      pageViewTelemetry="source_synchronization"
      isLoading={false}
    >
      <ViewContentHeader
        title={NAV.SYNCHRONIZATION}
        description={
          <>
            {SOURCE_SYNCHRONIZATION_DESCRIPTION}{' '}
            <EuiLink href={docLinks.workplaceSearchSynch} external>
              {LEARN_MORE_LINK}
            </EuiLink>
          </>
        }
      />
      <EuiSpacer />
      {isSyncConfigEnabled ? syncToggle : syncDisabledCallout}
    </SourceLayout>
  );
};
