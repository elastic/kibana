/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFieldNumber,
  EuiBadge,
  EuiButtonIcon,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';

import { ComponentStrings } from '../../../../i18n';
const { WorkpadConfig: strings } = ComponentStrings;

interface Props {
  setSize: ({ height, width }: { height: number; width: number }) => void;
  size: {
    height: number;
    width: number;
  };
}

const badges = [
  {
    name: '1080p',
    size: { height: 1080, width: 1920 },
  },
  {
    name: '720p',
    size: { height: 720, width: 1280 },
  },
  {
    name: 'A4',
    size: { height: 842, width: 590 },
  },
  {
    name: strings.getUSLetterButtonLabel(),
    size: { height: 792, width: 612 },
  },
];

export const WorkpadSize: FC<Props> = ({ setSize, size }) => {
  const rotate = () => setSize({ width: size.height, height: size.width });

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EuiFormRow label={strings.getPageWidthLabel()} display="rowCompressed">
            <EuiFieldNumber
              compressed
              onChange={(e) => setSize({ width: Number(e.target.value), height: size.height })}
              value={size.width}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow display="rowCompressed" hasEmptyLabelSpace>
            <EuiToolTip position="bottom" content={strings.getFlipDimensionTooltip()}>
              <EuiButtonIcon
                iconType="merge"
                color="text"
                onClick={rotate}
                aria-label={strings.getFlipDimensionAriaLabel()}
              />
            </EuiToolTip>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={strings.getPageHeightLabel()} display="rowCompressed">
            <EuiFieldNumber
              compressed
              onChange={(e) => setSize({ height: Number(e.target.value), width: size.width })}
              value={size.height}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div>
        {badges.map((badge, i) => (
          <EuiBadge
            key={`page-size-badge-${i}`}
            color="hollow"
            onClick={() => setSize(badge.size)}
            aria-label={strings.getPageSizeBadgeAriaLabel(badge.name)}
            onClickAriaLabel={strings.getPageSizeBadgeOnClickAriaLabel(badge.name)}
          >
            {badge.name}
          </EuiBadge>
        ))}
      </div>{' '}
    </>
  );
};

WorkpadSize.propTypes = {
  size: PropTypes.object.isRequired,
  setSize: PropTypes.func.isRequired,
};
