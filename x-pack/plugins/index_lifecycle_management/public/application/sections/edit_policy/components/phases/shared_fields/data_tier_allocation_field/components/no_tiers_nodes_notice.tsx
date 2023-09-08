/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiCallOut } from '@elastic/eui';

import {
  noCustomAttributesTitle,
  nodeAllocationMigrationGuidance,
} from './no_custom_attributes_messages';

export const NoTiersAvailableUsingNodeAttributesNotice: FunctionComponent = () => {
  return (
    <EuiCallOut
      data-test-subj="noTiersAvailableUsingNodeAttributesNotice"
      title={noCustomAttributesTitle}
      color="warning"
    >
      <p>
        {i18n.translate(
          'xpack.indexLifecycleMgmt.dataTier.noTiersAvailableUsingNodeAttributesDescription',
          {
            defaultMessage: 'Unable to allocate data: no available data nodes.',
          }
        )}
      </p>

      <p>{nodeAllocationMigrationGuidance}</p>
    </EuiCallOut>
  );
};
