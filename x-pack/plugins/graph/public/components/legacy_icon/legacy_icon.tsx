/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import classNames from 'classnames';
import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FontawesomeIcon } from '../../helpers/style_choices';

export interface LegacyIconProps {
  icon: FontawesomeIcon;
  selected?: boolean;
  onClick?: () => void;
  asListIcon?: boolean;
  className?: string;
}

export function LegacyIcon(props: LegacyIconProps) {
  const icon = (
    <i
      className={classNames('fa', props.className, 'gphLegacyIcon', {
        'gphLegacyIcon--selected': props.selected,
        'gphLegacyIcon--pickable': !!props.onClick,
        'gphLegacyIcon--list': props.asListIcon,
      })}
      aria-label={props.icon.label}
    >
      {props.icon.code}
    </i>
  );

  if (props.onClick) {
    return (
      <EuiButtonEmpty
        role="option"
        aria-selected={props.selected}
        color={props.selected ? 'primary' : 'text'}
        onClick={props.onClick}
      >
        {icon}
      </EuiButtonEmpty>
    );
  } else {
    return icon;
  }
}
