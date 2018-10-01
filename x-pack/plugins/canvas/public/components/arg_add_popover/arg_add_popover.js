/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { injectI18n } from '@kbn/i18n/react';
import { PropTypes } from 'prop-types';
import { EuiButtonIcon } from '@elastic/eui';
import { Popover } from '../popover';
import { ArgAdd } from '../arg_add';

const ArgAddPopoverUI = ({ options, intl }) => {
  const button = handleClick => (
    <EuiButtonIcon
      iconType="plusInCircle"
      aria-label={intl.formatMessage({
        id: 'xpack.canvas.argAddPopover.addArgumentButtonLabel',
        defaultMessage: 'Add Argument',
      })}
      onClick={handleClick}
    />
  );

  return (
    <Popover
      id="arg-add-popover"
      panelClassName="canvasArg__addPopover"
      panelPaddingSize="none"
      button={button}
    >
      {({ closePopover }) =>
        options.map(opt => (
          <ArgAdd
            key={`${opt.arg.name}-add`}
            displayName={opt.arg.displayName}
            help={opt.arg.help}
            onValueAdd={() => {
              opt.onValueAdd();
              closePopover();
            }}
          />
        ))
      }
    </Popover>
  );
};

ArgAddPopoverUI.propTypes = {
  options: PropTypes.array.isRequired,
};

export const ArgAddPopover = injectI18n(ArgAddPopoverUI);
