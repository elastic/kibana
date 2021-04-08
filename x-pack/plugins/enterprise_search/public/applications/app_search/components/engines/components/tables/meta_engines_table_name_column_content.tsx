/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiIcon, EuiHealth, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EuiLinkTo } from '../../../../../shared/react_router_helpers';
import { ENGINE_PATH } from '../../../../routes';
import { generateEncodedPath } from '../../../../utils/encode_path_params';
import { EngineDetails } from '../../../engine/types';

interface MetaEnginesTableNameContentProps {
  name: string;
  isExpanded: boolean;
  item: EngineDetails;
  hideRow: (name: string) => void;
  sendEngineTableLinkClickTelemetry: () => void;
  showRow: (name: string) => void;
}

export const MetaEnginesTableNameColumnContent: React.FC<MetaEnginesTableNameContentProps> = ({
  name,
  item,
  isExpanded,
  sendEngineTableLinkClickTelemetry,
  hideRow,
  showRow,
}) => (
  <EuiFlexGroup direction="column" gutterSize="none">
    <EuiLinkTo
      to={generateEncodedPath(ENGINE_PATH, { engineName: name })}
      onClick={sendEngineTableLinkClickTelemetry}
    >
      <strong>{name}</strong>
    </EuiLinkTo>
    <button
      type="button"
      onClick={() => (isExpanded ? hideRow(name) : showRow(name))}
      aria-expanded={isExpanded}
      className="meta-engines__expand-row"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={isExpanded ? 'arrowDown' : 'arrowRight'} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engines.metaEnginesTable.sourceEnginesCount',
            {
              defaultMessage: '{sourceEnginesCount, plural, one {# Engine} other {# Engines}}',
              values: { sourceEnginesCount: item.engine_count || 0 },
            }
          )}
        </EuiFlexItem>
        {item.schemaConflicts && Object.keys(item.schemaConflicts).length > 0 && (
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
