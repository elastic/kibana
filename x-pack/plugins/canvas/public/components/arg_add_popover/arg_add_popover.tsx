/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEventHandler, FC } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Popover } from '../popover';
import { ArgAdd } from '../arg_add';

const strings = {
  getAddAriaLabel: () =>
    i18n.translate('xpack.canvas.argAddPopover.addAriaLabel', {
      defaultMessage: 'Add argument',
    }),
};

export interface ArgOptions {
  name?: string;
  displayName?: string;
  help?: string;
  onValueAdd: () => void;
}

interface Props {
  options: ArgOptions[];
}

export const ArgAddPopover: FC<Props> = ({ options }) => {
  const button = (handleClick: MouseEventHandler<HTMLButtonElement>) => (
    <EuiButtonIcon
      iconType="plusInCircle"
      aria-label={strings.getAddAriaLabel()}
      onClick={handleClick}
      className="canvasArg__addArg"
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
        options.map((opt) => (
          <ArgAdd
            key={`${opt.name}-add`}
            displayName={opt.displayName ?? ''}
            help={opt.help ?? ''}
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

ArgAddPopover.propTypes = {
  options: PropTypes.array.isRequired,
};
