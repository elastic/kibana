/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiTextColor } from '@elastic/eui';
import { LearnMoreLink } from '../../learn_more_link';
import { ToggleFieldWithDescribedFormRow } from '../../described_form_row';
import { useKibana } from '../../../../../../shared_imports';

export const DeleteSearchableSnapshotField: React.FunctionComponent = () => {
  const { docLinks } = useKibana().services;
  return (
    <ToggleFieldWithDescribedFormRow
      title={
        <h3>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deleteSearchableSnapshotTitle"
            defaultMessage="Delete searchable snapshot"
          />
        </h3>
      }
      description={
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deleteSearchableSnapshotDescription"
            defaultMessage="Delete the searchable snapshot created in a previous phase."
          />{' '}
          <LearnMoreLink docPath={docLinks.links.elasticsearch.ilmDelete} />
        </EuiTextColor>
      }
      fullWidth
      titleSize="xs"
      switchProps={{
        'data-test-subj': `deleteSearchableSnapshotSwitch`,
        path: `phases.delete.actions.delete.delete_searchable_snapshot`,
      }}
    >
      <div />
    </ToggleFieldWithDescribedFormRow>
  );
};
