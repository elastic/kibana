/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';

const TrayUI = ({ children, done, intl }) => {
  return (
    <Fragment>
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            size="s"
            onClick={done}
            aria-label={intl.formatMessage({
              id: 'xpack.canvas.toolbar.tray.dismissTrayButtonAriaLabel',
              defaultMessage: 'Dismiss tray',
            })}
            iconType="arrowDown"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <div className="canvasTray">{children}</div>
    </Fragment>
  );
};

TrayUI.propTypes = {
  children: PropTypes.node,
  done: PropTypes.func,
};

export const Tray = injectI18n(TrayUI);
