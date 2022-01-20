/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiTitle } from '@elastic/eui';
import React, { lazy, Suspense, useEffect, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import type { Space } from '../../../../common';
import { getSpaceAvatarComponent } from '../../../space_avatar';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

interface Props {
  getActiveSpace: () => Promise<Space>;
}

export const AdvancedSettingsTitle = (props: Props) => {
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);

  useEffect(() => {
    props.getActiveSpace().then((space) => setActiveSpace(space));
  }, [props]);

  if (!activeSpace) return null;

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems={'center'}>
      <EuiFlexItem grow={false}>
        <Suspense fallback={<EuiLoadingSpinner />}>
          <LazySpaceAvatar space={activeSpace} />
        </Suspense>
      </EuiFlexItem>
      <EuiFlexItem style={{ marginLeft: '10px' }}>
        <EuiTitle size="m">
          <h1 data-test-subj="managementSettingsTitle">
            <FormattedMessage
              id="xpack.spaces.management.advancedSettingsTitle.settingsTitle"
              defaultMessage="Settings"
            />
          </h1>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
