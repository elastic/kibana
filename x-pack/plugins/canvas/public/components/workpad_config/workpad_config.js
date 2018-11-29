/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFieldText,
  EuiFieldNumber,
  EuiBadge,
  EuiButtonIcon,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';

export const WorkpadConfig = ({ size, name, setSize, setName }) => {
  const rotate = () => setSize({ width: size.height, height: size.width });

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
      name: 'US Letter',
      size: { height: 792, width: 612 },
    },
  ];

  return (
    <div>
      <EuiTitle size="xs">
        <h4>Workpad</h4>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFormRow label="Name" compressed>
        <EuiFieldText value={name} onChange={e => setName(e.target.value)} />
      </EuiFormRow>

      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EuiFormRow label="Width" compressed>
            <EuiFieldNumber
              onChange={e => setSize({ width: Number(e.target.value), height: size.height })}
              value={size.width}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiToolTip position="bottom" content="Flip the width and height">
              <EuiButtonIcon
                iconType="merge"
                color="text"
                onClick={rotate}
                aria-label="Swap Page Dimensions"
                style={{ marginBottom: 12 }}
              />
            </EuiToolTip>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Height" compressed>
            <EuiFieldNumber
              onChange={e => setSize({ height: Number(e.target.value), width: size.width })}
              value={size.height}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <div>
        {badges.map((badge, i) => (
          <EuiBadge
            key={`page-size-badge-${i}`}
            color="hollow"
            onClick={() => setSize(badge.size)}
            aria-label={`Preset Page Size: ${badge.name}`}
            onClickAriaLabel={`Set page size to ${badge.name}`}
          >
            {badge.name}
          </EuiBadge>
        ))}
      </div>
    </div>
  );
};

WorkpadConfig.propTypes = {
  size: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  setSize: PropTypes.func.isRequired,
  setName: PropTypes.func.isRequired,
};
