/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

/**
 * Returns a `PureComponent` that uses provided callback to retrieve/load the Component
 *
 * @param {Function} asyncLoadComponent
 *  A callback that return a `Promise` that must resolve to a `React.PureComponent`
 * @return {AsyncComponent}
 */
export function toAsyncComponent(asyncLoadComponent: () => Promise<PureComponent>) {
  class AsyncComponent extends PureComponent {
    state = { UIComponent: undefined };

    render() {
      const UIComponent = (this.state.UIComponent as unknown) as PureComponent;
      const { children, ...props } = this.props;
      return UIComponent ? <UIComponent {...props}>{children}</UIComponent> : <EuiLoadingSpinner />;
    }

    async componentDidMount() {
      if (!this.state.UIComponent) {
        const UIComponent = (await asyncLoadComponent()) as PureComponent;
        this.setState({ UIComponent });
      }
    }
  }

  return AsyncComponent;
}
