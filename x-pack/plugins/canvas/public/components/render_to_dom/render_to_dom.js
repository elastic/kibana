/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

export class RenderToDom extends React.Component {
  static propTypes = {
    domNode: PropTypes.object,
    setDomNode: PropTypes.func.isRequired,
    render: PropTypes.func.isRequired,
    style: PropTypes.object,
  };

  shouldComponentUpdate(nextProps) {
    return this.props.domNode !== nextProps.domNode;
  }

  componentDidUpdate() {
    // Calls render function once we have the reference to the DOM element to render into
    if (this.props.domNode) {
      this.props.render(this.props.domNode);
    }
  }

  render() {
    const { domNode, setDomNode, style } = this.props;
    const linkRef = refNode => {
      if (!domNode && refNode) {
        // Initialize the domNode property. This should only happen once, even if config changes.
        setDomNode(refNode);
      }
    };

    return <div className="render_to_dom" ref={linkRef} style={style} />;
  }
}
