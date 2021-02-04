/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState, useEffect } from 'react';
import { Space } from '../../../../../../../src/plugins/spaces_oss/common';
import { SpaceAvatar } from '../../../space_avatar';

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
        <SpaceAvatar space={activeSpace} />
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
