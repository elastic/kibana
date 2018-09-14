/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { compose, withPropsOnChange, withProps } from 'recompose';
import { RenderToDom } from '../render_to_dom';
import { ExpressionFormHandlers } from '../../../common/lib/expression_form_handlers';

class ArgTemplateFormComponent extends React.Component {
  static propTypes = {
    template: PropTypes.func,
    argumentProps: PropTypes.shape({
      valueMissing: PropTypes.bool,
      label: PropTypes.string,
      setLabel: PropTypes.func.isRequired,
      expand: PropTypes.bool,
      setExpand: PropTypes.func,
      onValueRemove: PropTypes.func,
      resetErrorState: PropTypes.func.isRequired,
      renderError: PropTypes.func.isRequired,
    }),
    handlers: PropTypes.object.isRequired,
    error: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]).isRequired,
    errorTemplate: PropTypes.oneOfType([PropTypes.element, PropTypes.func]).isRequired,
  };

  static domNode = null;

  componentWillUpdate(prevProps) {
    //see if error state changed
    if (this.props.error !== prevProps.error) this.props.handlers.destroy();
  }
  componentDidUpdate() {
    if (this.props.error) return this.renderErrorTemplate();
    this.renderTemplate(this.domNode);
  }

  componentWillUnmount() {
    this.props.handlers.destroy();
  }

  renderTemplate = domNode => {
    const { template, argumentProps, handlers } = this.props;
    if (template) return template(domNode, argumentProps, handlers);
  };

  renderErrorTemplate = () => {
    const { errorTemplate, argumentProps } = this.props;
    return React.createElement(errorTemplate, argumentProps);
  };

  render() {
    const { template, error } = this.props;

    if (error) return this.renderErrorTemplate();

    if (!template) return null;

    return (
      <RenderToDom
        render={domNode => {
          this.domNode = domNode;
          this.renderTemplate(domNode);
        }}
      />
    );
  }
}

export const ArgTemplateForm = compose(
  withPropsOnChange(
    () => false,
    () => ({
      expressionFormHandlers: new ExpressionFormHandlers(),
    })
  ),
  withProps(({ handlers, expressionFormHandlers }) => ({
    handlers: Object.assign(expressionFormHandlers, handlers),
  }))
)(ArgTemplateFormComponent);
