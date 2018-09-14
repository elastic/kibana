import { compose, withState } from 'recompose';
import { RenderToDom as Component } from './render_to_dom';

export const RenderToDom = compose(
  withState('domNode', 'setDomNode') // Still don't like this, seems to be the only way todo it.
)(Component);
