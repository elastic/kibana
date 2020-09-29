/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiBadge } from '@elastic/eui';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { px, truncate, unit } from '../../../../style/variables';

const BadgeText = styled.div`
  display: inline-block;
  ${truncate(px(unit * 12))};
  vertical-align: middle;
`;

interface Props {
  value: string[];
  onRemove: (val: string) => void;
}

const formatUrlValue = (val: string) => {
  const maxUrlToDisplay = 30;
  const urlLength = val.length;
  if (urlLength < maxUrlToDisplay) {
    return val;
  }
  const urlObj = new URL(val);
  if (urlObj.pathname === '/') {
    return val;
  }
  const domainVal = urlObj.hostname;
  const extraLength = urlLength - maxUrlToDisplay;
  const extraDomain = domainVal.substring(0, extraLength);

  if (urlObj.pathname.length + 7 > maxUrlToDisplay) {
    return val.replace(domainVal, '..');
  }

  return val.replace(extraDomain, '..');
};

const removeFilterLabel = i18n.translate(
  'xpack.apm.uifilter.badge.removeFilter',
  { defaultMessage: 'Remove filter' }
);

export function UrlList({ onRemove, value }: Props) {
  return (
    <EuiFlexGrid gutterSize="s">
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
            <BadgeText>{formatUrlValue(val)}</BadgeText>
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
}
