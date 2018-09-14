import { compose, withState, withHandlers } from 'recompose';
import { ContextMenu as Component } from './context_menu';
import { onKeyDownProvider, onKeyPressProvider } from './key_handlers';

export const ContextMenu = compose(
  withState('isOpen', 'setIsOpen', true),
  withState('selectedIndex', 'setSelectedIndex', -1),
  withHandlers({
    onKeyDown: onKeyDownProvider,
    onKeyPress: onKeyPressProvider,
  })
)(Component);
