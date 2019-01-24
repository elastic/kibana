/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDom from 'react-dom';
import PropTypes from 'prop-types';
import { ErrorBoundary } from '../components/enhance/error_boundary';

export const templateFromReactComponent = Component => {
  const WrappedComponent = props => (
    <ErrorBoundary>
      {({ error }) => {
        if (error) {
          props.renderError();
          return null;
        }

        return <Component {...props} />;
      }}
    </ErrorBoundary>
  );

  WrappedComponent.propTypes = {
    renderError: PropTypes.func,
  };

  return (domNode, config, handlers) => {
    try {
      const el = React.createElement(WrappedComponent, config);
      ReactDom.render(el, domNode, () => {
        handlers.done();
      });

      handlers.onDestroy(() => {
        ReactDom.unmountComponentAtNode(domNode);
      });
    } catch (err) {
      handlers.done();
      config.renderError();
    }
  };
};
