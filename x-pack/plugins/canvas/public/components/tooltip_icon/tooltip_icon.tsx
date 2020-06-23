/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint react/forbid-elements: 0 */
import React from 'react';
import PropTypes from 'prop-types';
import { EuiIconTip, PropsOf } from '@elastic/eui';

export enum IconType {
  error = 'error',
  warning = 'warning',
  info = 'info',
}

type EuiIconTipProps = PropsOf<typeof EuiIconTip>;

interface Props extends Omit<EuiIconTipProps, 'type' | 'color'> {
  icon: IconType;
}

export const TooltipIcon = ({ icon = IconType.info, ...rest }: Props) => {
  const icons = {
    [IconType.error]: { type: 'alert', color: 'danger' },
    [IconType.warning]: { type: 'alert', color: 'warning' },
    [IconType.info]: { type: 'iInCircle', color: 'default' },
  };

  return <EuiIconTip {...rest} type={icons[icon].type} color={icons[icon].color} />;
};

TooltipIcon.propTypes = {
  icon: PropTypes.string,
};
