/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { unit, px, truncate } from '../../../../../style/variables';

const BadgeText = euiStyled.div`
  display: inline-block;
  ${truncate(px(unit * 8))};
  vertical-align: middle;
`;

interface Props {
  value: string[];
  onRemove: (val: string) => void;
  name: string;
}

const removeFilterLabel = i18n.translate(
  'xpack.apm.uifilter.badge.removeFilter',
  { defaultMessage: 'Remove filter' }
);

function FilterBadgeList({ onRemove, value, name }: Props) {
  return (
    <EuiFlexGrid gutterSize="s" id={`local-filter-values-${name}`}>
      {value.map((val) => (
        <EuiFlexItem key={val} grow={false}>
          <EuiBadge
            color="hollow"
            onClick={() => {
              onRemove(val);
            }}
            onClickAriaLabel={removeFilterLabel}
            iconOnClick={() => {
              onRemove(val);
            }}
            iconOnClickAriaLabel={removeFilterLabel}
            iconType="cross"
            iconSide="right"
          >
            <BadgeText>{val}</BadgeText>
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
}

export { FilterBadgeList };
