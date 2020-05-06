/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { isEqual, cloneDeep } from 'lodash';
import { RenderToDom } from '../render_to_dom';
import { ErrorStrings } from '../../../i18n';

const { RenderWithFn: strings } = ErrorStrings;

export class RenderWithFn extends React.Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    renderFn: PropTypes.func.isRequired,
    reuseNode: PropTypes.bool,
    handlers: PropTypes.shape({
      // element handlers, see components/element_wrapper/lib/handlers.js
      setFilter: PropTypes.func.isRequired,
      getFilter: PropTypes.func.isRequired,
      done: PropTypes.func.isRequired,
      // render handlers, see lib/handlers.js
      resize: PropTypes.func.isRequired,
      onResize: PropTypes.func.isRequired,
      destroy: PropTypes.func.isRequired,
      onDestroy: PropTypes.func.isRequired,
    }),
    config: PropTypes.object.isRequired,
    size: PropTypes.object.isRequired,
    onError: PropTypes.func.isRequired,
  };

  static defaultProps = {
    reuseNode: false,
  };

  componentDidMount() {
    this.firstRender = true;
    this.renderTarget = null;
  }

  UNSAFE_componentWillReceiveProps({ renderFn }) {
    const newRenderFunction = renderFn !== this.props.renderFn;

    if (newRenderFunction) {
      this._resetRenderTarget(this._domNode);
    }
  }

  shouldComponentUpdate(prevProps) {
    return !isEqual(this.props.size, prevProps.size) || this._shouldFullRerender(prevProps);
  }

  componentDidUpdate(prevProps) {
    const { handlers, size } = this.props;
    // Config changes
    if (this._shouldFullRerender(prevProps)) {
      // This should be the only place you call renderFn besides the first time
      this._callRenderFn();
    }

    // Size changes
    if (!isEqual(size, prevProps.size)) {
      return handlers.resize(size);
    }
  }

  componentWillUnmount() {
    this.props.handlers.destroy();
  }

  _domNode = null;

  _callRenderFn = () => {
    const { handlers, config, renderFn, reuseNode, name: functionName } = this.props;
    // TODO: We should wait until handlers.done() is called before replacing the element content?
    if (!reuseNode || !this.renderTarget) {
      this._resetRenderTarget(this._domNode);
    }
    // else if (!firstRender) handlers.destroy();

    const renderConfig = cloneDeep(config);

    // TODO: this is hacky, but it works. it stops Kibana from blowing up when a render throws
    try {
      renderFn(this.renderTarget, renderConfig, handlers);
      this.firstRender = false;
    } catch (err) {
      console.error('renderFn threw', err);
      this.props.onError(err, { title: strings.getRenderErrorMessage(functionName) });
    }
  };

  _resetRenderTarget = domNode => {
    const { handlers } = this.props;

    if (!domNode) {
      throw new Error('RenderWithFn can not reset undefined target node');
    }

    // call destroy on existing element
    if (!this.firstRender) {
      handlers.destroy();
    }

    while (domNode.firstChild) {
      domNode.removeChild(domNode.firstChild);
    }

    this.firstRender = true;
    this.renderTarget = this._createRenderTarget();
    domNode.appendChild(this.renderTarget);
  };

  _createRenderTarget = () => {
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    return div;
  };

  _shouldFullRerender = prevProps => {
    // required to stop re-renders on element move, anything that should
    // cause a re-render needs to be checked here
    // TODO: fix props passed in to remove this check
    return (
      this.props.handlers !== prevProps.handlers ||
      !isEqual(this.props.config, prevProps.config) ||
      !isEqual(this.props.renderFn.toString(), prevProps.renderFn.toString())
    );
  };

  destroy = () => {
    this.props.handlers.destroy();
  };

  render() {
    // NOTE: the data-shared-* attributes here are used for reporting
    return (
      <div
        className="canvasWorkpad--element_render canvasRenderEl"
        style={{ height: '100%', width: '100%' }}
      >
        <RenderToDom
          style={{ height: '100%', width: '100%' }}
          render={domNode => {
            this._domNode = domNode;
            this._callRenderFn();
          }}
        />
      </div>
    );
  }
}
