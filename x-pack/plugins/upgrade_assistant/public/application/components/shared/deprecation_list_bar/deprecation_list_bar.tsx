/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DeprecationCountSummary } from './count_summary';

const i18nTexts = {
  expandAllButton: i18n.translate(
    'xpack.upgradeAssistant.deprecationListBar.expandAllButtonLabel',
    {
      defaultMessage: 'Expand all',
    }
  ),
  collapseAllButton: i18n.translate(
    'xpack.upgradeAssistant.deprecationListBar.collapseAllButtonLabel',
    {
      defaultMessage: 'Collapse all',
    }
  ),
};

export const DeprecationListBar: FunctionComponent<{
  allDeprecationsCount: number;
  filteredDeprecationsCount: number;
  setExpandAll: (shouldExpandAll: boolean) => void;
}> = ({ allDeprecationsCount, filteredDeprecationsCount, setExpandAll }) => {
  return (
    <EuiFlexGroup responsive={false} justifyContent="spaceBetween" alignItems="baseline">
      <EuiFlexItem>
        <DeprecationCountSummary
          allDeprecationsCount={allDeprecationsCount}
          filteredDeprecationsCount={filteredDeprecationsCount}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              size="s"
              onClick={() => setExpandAll(true)}
              data-test-subj="expandAll"
            >
              {i18nTexts.expandAllButton}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              size="s"
              onClick={() => setExpandAll(false)}
              data-test-subj="collapseAll"
            >
              {i18nTexts.collapseAllButton}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
