/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { EuiFlexGroup, EuiFlexItem, EuiBadgeProps, EuiI18n } from '@elastic/eui';

interface IEuiHeaderAlertProps {
  action: JSX.Element;
  className?: string;
  date: string;
  text: string;
  title: string;
  badge?: JSX.Element;
  rest?: string[];
}

export const EuiHeaderAlert = ({
  action,
  className,
  date,
  text,
  title,
  badge,
  ...rest
}: IEuiHeaderAlertProps) => {
  const classes = classNames('euiHeaderAlert', className);

  let badgeContent: JSX.Element | null;
  if (badge) {
    badgeContent = badge;
  } else {
    badgeContent = null;
  }

  return (
    <EuiI18n token="euiHeaderAlert.dismiss" default="Dismiss">
      {(dismiss: any) => (
        <div className={classes} {...rest}>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <div className="euiHeaderAlert__date">{date}</div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{badgeContent}</EuiFlexItem>
          </EuiFlexGroup>

          <div className="euiHeaderAlert__title">{title}</div>
          <div className="euiHeaderAlert__text">{text}</div>
          <div className="euiHeaderAlert__action euiLink">{action}</div>
        </div>
      )}
    </EuiI18n>
  );
};

EuiHeaderAlert.propTypes = {
  action: PropTypes.node,
  className: PropTypes.string,
  date: PropTypes.node.isRequired,
  text: PropTypes.node,
  title: PropTypes.node.isRequired,
  badge: PropTypes.node,
};
