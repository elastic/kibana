/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode, Fragment, MouseEventHandler } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';

import { ComponentStrings } from '../../../../i18n';
const { ToolbarTray: strings } = ComponentStrings;

interface Props {
  children: ReactNode;
  done: MouseEventHandler<HTMLAnchorElement>;
}

export const Tray = ({ children, done }: Props) => {
  return (
    <Fragment>
      <EuiFlexGroup className="canvasTray__toggle" justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            size="s"
            onClick={done}
            aria-label={strings.getCloseTrayAriaLabel()}
            iconType="arrowDown"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <div className="canvasTray">{children}</div>
    </Fragment>
  );
};

Tray.propTypes = {
  children: PropTypes.node,
  done: PropTypes.func,
};
