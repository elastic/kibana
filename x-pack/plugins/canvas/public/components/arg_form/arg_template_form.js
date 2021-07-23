/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import usePrevious from 'react-use/lib/usePrevious';
import { RenderToDom } from '../render_to_dom';
import { ExpressionFormHandlers } from '../../../common/lib/expression_form_handlers';

const mergeWithFormHandlers = (handlers) => Object.assign(new ExpressionFormHandlers(), handlers);

export const ArgTemplateForm = ({ template, argumentProps, handlers, error, errorTemplate }) => {
  const [updatedHandlers, setHandlers] = useState(mergeWithFormHandlers(handlers));
  const previousError = usePrevious(error);
  const domNodeRef = useRef();
  const renderTemplate = useCallback(
    (domNode) => template && template(domNode, argumentProps, updatedHandlers),
    [template, argumentProps, updatedHandlers]
  );

  const renderErrorTemplate = useCallback(() => React.createElement(errorTemplate, argumentProps), [
    errorTemplate,
    argumentProps,
  ]);

  useEffect(() => {
    setHandlers(mergeWithFormHandlers(handlers));
  }, [handlers]);

  useEffect(() => {
    if (previousError !== error) updatedHandlers.destroy();
  }, [previousError, error, updatedHandlers]);

  useEffect(() => {
    if (!error) renderTemplate(domNodeRef.current);
  }, [error, renderTemplate, domNodeRef]);

  if (error) return renderErrorTemplate();
  if (!template) return null;

  return (
    <RenderToDom
      render={(domNode) => {
        domNodeRef.current = domNode;
        renderTemplate(domNode);
      }}
    />
  );
};

ArgTemplateForm.propTypes = {
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
