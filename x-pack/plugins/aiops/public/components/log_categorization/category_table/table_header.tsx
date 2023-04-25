/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useEuiTheme } from '../../../hooks/use_eui_theme';
import { getLabels } from './labels';
import { QueryMode, QUERY_MODE } from '../use_discover_links';

interface Props {
  categoriesCount: number;
  selectedCategoriesCount: number;
  labels: ReturnType<typeof getLabels>;
  openInDiscover: (mode: QueryMode) => void;
}

export const TableHeader: FC<Props> = ({
  categoriesCount,
  selectedCategoriesCount,
  labels,
  openInDiscover,
}) => {
  const euiTheme = useEuiTheme();
  return (
    <>
      <EuiFlexGroup gutterSize="none" alignItems="center" css={{ minHeight: euiTheme.euiSizeXL }}>
        <EuiFlexItem>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.aiops.logCategorization.counts"
              defaultMessage="{count} patterns found"
              values={{ count: categoriesCount }}
            />
            {selectedCategoriesCount > 0 ? (
              <>
                <FormattedMessage
                  id="xpack.aiops.logCategorization.selectedCounts"
                  defaultMessage=" | {count} selected"
                  values={{ count: selectedCategoriesCount }}
                />
              </>
            ) : null}
          </EuiText>
        </EuiFlexItem>
        {selectedCategoriesCount > 0 ? (
          <>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={() => openInDiscover(QUERY_MODE.INCLUDE)}
                iconType="plusInCircle"
                iconSide="left"
              >
                {labels.multiSelect.in}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={() => openInDiscover(QUERY_MODE.EXCLUDE)}
                iconType="minusInCircle"
                iconSide="left"
              >
                {labels.multiSelect.out}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        ) : null}
      </EuiFlexGroup>
    </>
  );
};
