/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiCallOut } from '@elastic/eui';

import { DataTierRole } from '../../../../../../../../../common/types';
import {
  noCustomAttributesTitle,
  nodeAllocationMigrationGuidance,
} from './no_custom_attributes_messages';
import { nodeRoleToFallbackTierMap } from './node_role_to_fallback_tier_map';

interface Props {
  targetNodeRole: DataTierRole;
}

export const WillUseFallbackTierUsingNodeAttributesNotice: FunctionComponent<Props> = ({
  targetNodeRole,
}) => {
  return (
    <EuiCallOut
      data-test-subj="willUseFallbackTierUsingNodeAttributesNotice"
      title={noCustomAttributesTitle}
    >
      <p>
        {i18n.translate(
          'xpack.indexLifecycleMgmt.dataTier.willUseFallbackTierUsingNodeAttributesDescription',
          {
            defaultMessage: 'Data will be allocated to the {tier} tier.',
            values: { tier: nodeRoleToFallbackTierMap[targetNodeRole] },
          }
        )}
      </p>

      <p>{nodeAllocationMigrationGuidance}</p>
    </EuiCallOut>
  );
};
