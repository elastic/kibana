/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

export class ElementShareContainer extends React.PureComponent {
  static propTypes = {
    functionName: PropTypes.string.isRequired,
    onComplete: PropTypes.func.isRequired,
    className: PropTypes.string,
    children: PropTypes.node.isRequired,
  };

  state = {
    renderComplete: false,
  };

  componentDidMount() {
    const { onComplete } = this.props;

    // check that the done event is called within a certain time
    this.createDoneChecker();

    // dispatches a custom DOM event on the container when the element is complete
    onComplete(() => {
      this.clearDoneChecker();
      if (!this.sharedItemRef) {
        return;
      } // without this, crazy fast forward/backward paging leads to an error
      const ev = new CustomEvent('renderComplete');
      this.sharedItemRef.dispatchEvent(ev);

      // if the element is finished before reporting is listening for the
      // renderComplete event, the report never completes. to get around that
      // issue, track the completed state locally and set the
      // [data-render-complete] value accordingly.
      // this is similar to renderComplete directive in Kibana,
      // see: src/legacy/ui/public/render_complete/directive.js
      this.setState({ renderComplete: true });
    });
  }

  getSnapshotBeforeUpdate(prevProps) {
    return { functionName: prevProps.functionName };
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // if function name changed, clear and recreate done checker
    if (snapshot.functionName !== this.props.functionName) {
      this.clearDoneChecker();
      this.createDoneChecker();
    }
  }

  componentWillUnmount() {
    this.clearDoneChecker();
  }

  createDoneChecker = () => {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (!isDevelopment) {
      return;
    }

    const { functionName } = this.props;
    const timeout = 15; // timeout, in seconds
    this.timeout = setTimeout(() => {
      // TODO: show this message in a proper notification
      console.warn(
        `done handler not called in render function after ${timeout} seconds: ${functionName}`
      );
    }, timeout * 1000);
  };

  clearDoneChecker = () => {
    clearTimeout(this.timeout);
  };

  render() {
    const shouldTrackComplete = this.props.functionName !== 'embeddable';

    // NOTE: the data-shared-item and data-render-complete attributes are used for reporting
    // Embeddables should be setting data-shared-item and data-render-complete on themselves
    // so we should not be tracking them here.
    return (
      <div
        data-shared-item={shouldTrackComplete ? this.state.renderComplete : undefined}
        data-render-complete={shouldTrackComplete ? this.state.renderComplete : undefined}
        className={this.props.className}
        ref={(ref) => (this.sharedItemRef = ref)}
      >
        {this.props.children}
      </div>
    );
  }
}
