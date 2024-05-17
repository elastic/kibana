/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useKibana } from '../../../../../../shared_imports';
import { ToggleFieldWithDescribedFormRow } from '../../described_form_row';
import { LearnMoreLink } from '../../learn_more_link';
interface Props {
  phase: 'hot' | 'warm' | 'cold';
}

export const ReadonlyField: React.FunctionComponent<Props> = ({ phase }) => {
  const { docLinks } = useKibana().services;
  return (
    <ToggleFieldWithDescribedFormRow
      title={
        <h3>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.readonlyTitle"
            defaultMessage="Read only"
          />
        </h3>
      }
      description={
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.readonlyDescription"
            defaultMessage="Enable to make the index and index metadata read only, disable to allow writes and metadata changes."
          />{' '}
          <LearnMoreLink docPath={docLinks.links.elasticsearch.ilmReadOnly} />
        </EuiTextColor>
      }
      fullWidth
      titleSize="xs"
      switchProps={{
        'data-test-subj': `${phase}-readonlySwitch`,
        path: `_meta.${phase}.readonlyEnabled`,
      }}
    >
      <div />
    </ToggleFieldWithDescribedFormRow>
  );
};
