/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiIcon, EuiHealth, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EngineDetails } from '../../../engine/types';

import { renderEngineLink } from './engine_link_helpers';

interface MetaEnginesTableNameContentProps {
  isExpanded: boolean;
  item: EngineDetails;
  hideRow: (name: string) => void;
  showRow: (name: string) => void;
}

export const MetaEnginesTableNameColumnContent: React.FC<MetaEnginesTableNameContentProps> = ({
  item: { name, schemaConflicts, engine_count: engineCount },
  isExpanded,
  hideRow,
  showRow,
}) => (
  <EuiFlexGroup direction="column" gutterSize="none">
    {renderEngineLink(name)}
    <button
      type="button"
      onClick={() => (isExpanded ? hideRow(name) : showRow(name))}
      aria-expanded={isExpanded}
      data-test-subj="ExpandRowButton"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={isExpanded ? 'arrowDown' : 'arrowRight'} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} data-test-subj="SourceEnginesCount">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engines.metaEnginesTable.sourceEnginesCount',
            {
              defaultMessage: '{sourceEnginesCount, plural, one {# engine} other {# engines}}',
              values: { sourceEnginesCount: engineCount || 0 },
            }
          )}
        </EuiFlexItem>
        {schemaConflicts && Object.keys(schemaConflicts).length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiHealth color="warning">
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engines.metaEnginesTable.fieldTypeConflictWarning',
                {
                  defaultMessage: 'Field-type conflict',
                }
              )}
            </EuiHealth>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </button>
  </EuiFlexGroup>
);
