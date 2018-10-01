/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint react/forbid-elements: 0 */
import React from 'react';
import { PropTypes } from 'prop-types';
import { EuiIconTip } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';

const TooltipIconUI = ({ intl, icon = 'info', ...rest }) => {
  const icons = {
    error: { type: 'alert', color: 'danger' },
    warning: { type: 'alert', color: 'warning' },
    info: { type: 'iInCircle', color: 'default' },
  };

  if (!Object.keys(icons).includes(icon)) {
    throw new Error(
      intl.formatMessage(
        {
          id: 'xpack.canvas.tooltipIcon.unsupportedIconTypeErrorMessage',
          defaultMessage: 'Unsupported icon type: {icon}',
        },
        {
          icon,
        }
      )
    );
  }
  return <EuiIconTip {...rest} type={icons[icon].type} color={icons[icon].color} />;
};

TooltipIconUI.propTypes = {
  icon: PropTypes.string,
};

export const TooltipIcon = injectI18n(TooltipIconUI);
