/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTextColor } from '@elastic/eui';

import { LearnMoreLink, ToggleFieldWithDescribedFormRow } from '../../';

interface Props {
  phase: 'cold' | 'frozen';
}

export const FreezeField: FunctionComponent<Props> = ({ phase }) => {
  return (
    <ToggleFieldWithDescribedFormRow
      title={
        <h3>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.freezeText"
            defaultMessage="Freeze"
          />
        </h3>
      }
      description={
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.freezeIndexExplanationText"
            defaultMessage="Make the index read-only and minimize its memory footprint."
          />{' '}
          <LearnMoreLink docPath="ilm-freeze.html" />
        </EuiTextColor>
      }
      fullWidth
      titleSize="xs"
      switchProps={{
        'data-test-subj': `${phase}-freezeSwitch`,
        path: `_meta.${phase}.freezeEnabled`,
      }}
    >
      <div />
    </ToggleFieldWithDescribedFormRow>
  );
};
