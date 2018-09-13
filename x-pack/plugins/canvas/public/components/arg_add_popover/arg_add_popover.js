import React from 'react';
import { PropTypes } from 'prop-types';
import { EuiButtonIcon } from '@elastic/eui';
import { Popover } from '../popover';
import { ArgAdd } from '../arg_add';

export const ArgAddPopover = ({ options }) => {
  const button = handleClick => (
    <EuiButtonIcon iconType="plusInCircle" aria-label="Add Argument" onClick={handleClick} />
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

ArgAddPopover.propTypes = {
  options: PropTypes.array.isRequired,
};
