/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentType, FC } from 'react';
import { unmountComponentAtNode, render } from 'react-dom';
import PropTypes from 'prop-types';
import { I18nProvider } from '@kbn/i18n/react';
import { ErrorBoundary } from '../components/enhance/error_boundary';
import { ArgumentHandlers } from '../../types/arguments';

interface Props {
  renderError: Function;
}

export const templateFromReactComponent = (Component: ComponentType<any>) => {
  const WrappedComponent: FC<Props> = (props) => (
    <ErrorBoundary>
      {({ error }) => {
        if (error) {
          props.renderError();
          return null;
        }

        return (
          <I18nProvider>
            <Component {...props} />
          </I18nProvider>
        );
      }}
    </ErrorBoundary>
  );

  WrappedComponent.propTypes = {
    renderError: PropTypes.func,
  };

  return (domNode: HTMLElement, config: Props, handlers: ArgumentHandlers) => {
    try {
      const el = React.createElement(WrappedComponent, config);
      render(el, domNode, () => {
        handlers.done();
      });

      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });
    } catch (err) {
      handlers.done();
      config.renderError();
    }
  };
};
