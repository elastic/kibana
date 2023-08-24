/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useLeftPanelContext } from '../context';
import { getField } from '../../shared/utils';
import { UserDetails } from './user_details';
import { HostDetails } from './host_details';
import { ENTITIES_DETAILS_TEST_ID } from './test_ids';

export const ENTITIES_TAB_ID = 'entities-details';

/**
 * Entities displayed in the document details expandable flyout left section under the Insights tab
 */
export const EntitiesDetails: React.FC = () => {
  const { getFieldsData } = useLeftPanelContext();
  const hostName = getField(getFieldsData('host.name'));
  const userName = getField(getFieldsData('user.name'));
  const timestamp = getField(getFieldsData('@timestamp'));

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj={ENTITIES_DETAILS_TEST_ID}>
      {userName && timestamp && (
        <EuiFlexItem>
          <UserDetails userName={userName} timestamp={timestamp} />
        </EuiFlexItem>
      )}
      {hostName && timestamp && (
        <EuiFlexItem>
          <HostDetails hostName={hostName} timestamp={timestamp} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

EntitiesDetails.displayName = 'EntitiesDetails';
