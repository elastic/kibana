/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCode,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { SearchableSnapshotAction } from '../../../../../common/types';
import { i18nTexts } from '../../edit_policy/i18n_texts';

export const SearchableSnapshot = ({
  searchableSnapshot,
}: {
  searchableSnapshot?: SearchableSnapshotAction;
}) => {
  return searchableSnapshot ? (
    <>
      <EuiDescriptionListTitle>
        {i18nTexts.editPolicy.searchableSnapshotLabel}
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <EuiText color="subdued">
          <EuiSpacer size="s" />
          {i18nTexts.editPolicy.searchableSnapshotsRepoFieldLabel}
          {': '}
          <EuiCode>{searchableSnapshot.snapshot_repository}</EuiCode>
        </EuiText>
      </EuiDescriptionListDescription>
    </>
  ) : null;
};
