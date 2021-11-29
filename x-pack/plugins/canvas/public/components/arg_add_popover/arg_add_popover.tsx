/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEventHandler, FC } from 'react';
import PropTypes from 'prop-types';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ClassNames } from '@emotion/react';
import { Popover } from '../popover';
import { ArgAdd } from '../arg_add';
import type { Arg } from '../../expression_types/arg';
import { argAddArgStylesFactory, argAddPopoverStyles } from './arg_add_popover.styles';

const strings = {
  getAddAriaLabel: () =>
    i18n.translate('xpack.canvas.argAddPopover.addAriaLabel', {
      defaultMessage: 'Add argument',
    }),
};

interface ArgOptions {
  arg: Arg;
  onValueAdd: () => void;
}

interface Props {
  options: ArgOptions[];
}

export const ArgAddPopover: FC<Props> = ({ options }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <ClassNames>
      {({ css }) => (
        <Popover
          id="arg-add-popover"
          panelClassName={css(argAddPopoverStyles)}
          panelPaddingSize="none"
          button={(handleClick: MouseEventHandler<HTMLButtonElement>) => (
            <EuiButtonIcon
              iconType="plusInCircle"
              aria-label={strings.getAddAriaLabel()}
              onClick={handleClick}
              className={css(argAddArgStylesFactory(euiTheme))}
            />
          )}
        >
          {({ closePopover }) =>
            options.map((opt) => (
              <ArgAdd
                key={`${opt.arg.name}-add`}
                displayName={opt.arg.displayName ?? ''}
                help={opt.arg.help ?? ''}
                onValueAdd={() => {
                  opt.onValueAdd();
                  closePopover();
                }}
              />
            ))
          }
        </Popover>
      )}
    </ClassNames>
  );
};

ArgAddPopover.propTypes = {
  options: PropTypes.array.isRequired,
};
