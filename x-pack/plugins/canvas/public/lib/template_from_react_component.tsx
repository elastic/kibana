/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  ComponentType,
  forwardRef,
  ForwardRefRenderFunction,
  useImperativeHandle,
  useState,
} from 'react';
import { unmountComponentAtNode, render } from 'react-dom';
import PropTypes from 'prop-types';
import { I18nProvider } from '@kbn/i18n/react';
import { ErrorBoundary } from '../components/enhance/error_boundary';
import { ArgumentHandlers } from '../../types/arguments';

export interface Props {
  renderError: Function;
}

export interface UpdatePropsRef {
  updateProps: (newProps: Props) => void;
}

export const templateFromReactComponent = (Component: ComponentType<any>) => {
  const WrappedComponent: ForwardRefRenderFunction<UpdatePropsRef, Props> = (props, ref) => {
    const [updatedProps, setUpdatedProps] = useState<Props>(props);

    useImperativeHandle(ref, () => ({
      updateProps: (newProps: Props) => {
        setUpdatedProps(newProps);
      },
    }));

    return (
      <ErrorBoundary>
        {({ error }) => {
          if (error) {
            props.renderError();
            return null;
          }

          return (
            <I18nProvider>
              <Component {...updatedProps} />
            </I18nProvider>
          );
        }}
      </ErrorBoundary>
    );
  };

  const ForwardRefWrappedComponent = forwardRef(WrappedComponent);

  ForwardRefWrappedComponent.propTypes = {
    renderError: PropTypes.func,
  };

  return (
    domNode: HTMLElement,
    config: Props,
    handlers: ArgumentHandlers,
    onRef: (ref: UpdatePropsRef | null) => void
  ) => {
    try {
      const el = (
        <ForwardRefWrappedComponent
          {...config}
          ref={(ref) => {
            onRef?.(ref);
          }}
        />
      );
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
