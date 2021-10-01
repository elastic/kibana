/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiTitle,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FieldStats } from '../../../../../common/search_strategies/field_stats_types';
import { TopValues } from './top_values';
import { IndexPatternField } from '../../../../../../../../src/plugins/data/common';

export function CorrelationsContextPopover({
  fieldName,
  stats,
  onAddFilter,
}: {
  fieldName: string;
  stats?: FieldStats;
  onAddFilter: (
    field: IndexPatternField | string,
    value: string,
    type: '+' | '-'
  ) => void;
}) {
  const [infoIsOpen, setOpen] = useState(false);

  const popoverTitle = (
    <EuiPopoverTitle
      style={{ textTransform: 'none' }}
      className="eui-textBreakWord"
    >
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem grow={true}>
          <h5>{fieldName}</h5>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopoverTitle>
  );

  return (
    <EuiPopover
      display="block"
      button={
        <EuiButtonIcon
          iconType="inspect"
          onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
            setOpen(true);
          }}
          aria-label={i18n.translate(
            'xpack.apm.correlations.fieldContextPopover.inspectAriaLabel',
            {
              defaultMessage: 'Inspect',
            }
          )}
          data-test-subj={'apmCorrelationsContextPopoverButton'}
        />
      }
      isOpen={infoIsOpen}
      closePopover={() => setOpen(false)}
      anchorPosition="rightUp"
      data-test-subj={'apmCorrelationsContextPopover'}
    >
      {popoverTitle}
      <EuiTitle size="xxxs">
        <h5>
          {i18n.translate(
            'xpack.apm.correlations.fieldContextPopover.fieldTopValuesLabel',
            {
              defaultMessage: 'Top 10 values',
            }
          )}
        </h5>
      </EuiTitle>
      {infoIsOpen ? (
        <TopValues stats={stats} onAddFilter={onAddFilter} />
      ) : null}
    </EuiPopover>
  );
}
