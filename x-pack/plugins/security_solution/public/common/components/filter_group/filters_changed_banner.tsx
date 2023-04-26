/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import { TEST_IDS } from './constants';
import {
  FILTER_GROUP_BANNER_MESSAGE,
  FILTER_GROUP_BANNER_TITLE,
  REVERT_CHANGES,
  SAVE_CHANGES,
} from './translations';

interface FiltersChangesBanner {
  saveChangesHandler: () => void;
  discardChangesHandler: () => void;
}

export const FiltersChangedBanner: FC<FiltersChangesBanner> = ({
  saveChangesHandler,
  discardChangesHandler,
}) => {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s">
      <EuiFlexItem grow={true}>
        <EuiCallOut
          data-test-subj={TEST_IDS.FILTERS_CHANGED_BANNER}
          title={FILTER_GROUP_BANNER_TITLE}
          iconType="iInCircle"
        >
          <p>{FILTER_GROUP_BANNER_MESSAGE}</p>
          <EuiButton
            data-test-subj="filter-group__save"
            color="primary"
            onClick={saveChangesHandler}
          >
            {SAVE_CHANGES}
          </EuiButton>
          <EuiButtonEmpty
            data-test-subj={TEST_IDS.FILTERS_CHANGED_BANNER_DISCARD}
            onClick={discardChangesHandler}
          >
            {REVERT_CHANGES}
          </EuiButtonEmpty>
        </EuiCallOut>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
