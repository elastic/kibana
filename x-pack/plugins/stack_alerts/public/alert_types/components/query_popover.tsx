/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiExpression,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { Query, DataView } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import { QueryStringInput } from '@kbn/unified-search-plugin/public';

interface QueryPopoverProps {
  query: Query;
  dataViews: DataView[];
  onChangeQuery: (query: Query) => void;
}

export const QueryPopover = ({ query, dataViews, onChangeQuery }: QueryPopoverProps) => {
  const [queryPopoverOpen, setQueryPopoverOpen] = useState(false);

  const openPopover = () => setQueryPopoverOpen(true);
  const closeQueryPopover = () => setQueryPopoverOpen(false);

  return (
    <EuiPopover
      id="dataViewPopover"
      button={
        <EuiExpression
          className="dscExpressionParam"
          description={'Query'}
          value={query.query}
          display="columns"
          onClick={openPopover}
        />
      }
      isOpen={queryPopoverOpen}
      closePopover={closeQueryPopover}
      ownFocus
      anchorPosition="downLeft"
      zIndex={4000}
      display="block"
    >
      <div style={{ width: '530px' }}>
        <EuiPopoverTitle>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem>
              {i18n.translate('xpack.stackAlerts.components.ui.alertParams.queryPopoverTitle', {
                defaultMessage: 'Query',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="closePopover"
                iconType="cross"
                color="danger"
                aria-label={i18n.translate(
                  'xpack.stackAlerts.components.ui.alertParams.closeDataViewPopoverLabel',
                  { defaultMessage: 'Close' }
                )}
                onClick={closeQueryPopover}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
        <EuiFormRow id="indexSelectSearchBox" fullWidth>
          <QueryStringInput query={query} indexPatterns={dataViews} onChange={onChangeQuery} />
        </EuiFormRow>
      </div>
    </EuiPopover>
  );
};
