/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { i18nTexts } from './data_tier_allocation';

export const NoNodeAttributesWarning: FunctionComponent = () => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        data-test-subj="noNodeAttributesWarning"
        style={{ maxWidth: 400 }}
        title={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesMissingLabel"
            defaultMessage="No node attributes configured in elasticsearch.yml"
          />
        }
        color="warning"
      >
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesMissingDescription"
          defaultMessage="You must define custom node attributes to control shard allocation. {defaultOption} allocation will be used."
          values={{
            defaultOption: <b>{i18nTexts.allocationOptions.default.input}</b>,
          }}
        />
      </EuiCallOut>
    </>
  );
};
