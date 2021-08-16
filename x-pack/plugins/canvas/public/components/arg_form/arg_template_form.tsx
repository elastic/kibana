/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { RenderToDom } from '../render_to_dom';
import { ExpressionFormHandlers } from '../../../common/lib/expression_form_handlers';

interface ArgTemplateFormProps {
  template?: (
    domNode: HTMLElement,
    config: ArgTemplateFormProps['argumentProps'],
    handlers: ArgTemplateFormProps['handlers']
  ) => void;
  argumentProps: {
    valueMissing?: boolean;
    label?: string;
    setLabel: (label: string) => void;
    expand?: boolean;
    setExpand?: (expand: boolean) => void;
    onValueRemove?: (argName: string, argIndex: string) => void;
    resetErrorState: () => void;
    renderError: () => void;
  };
  handlers?: { [key: string]: (...args: any[]) => any };
  error?: unknown;
  errorTemplate: React.FunctionComponent<ArgTemplateFormProps['argumentProps']>;
}

const mergeWithFormHandlers = (handlers: ArgTemplateFormProps['handlers']) =>
  Object.assign(new ExpressionFormHandlers(), handlers);

export const ArgTemplateForm: React.FunctionComponent<ArgTemplateFormProps> = ({
  template,
  argumentProps,
  handlers,
  error,
  errorTemplate,
}) => {
  const [updatedHandlers, setHandlers] = useState(mergeWithFormHandlers(handlers));
  const previousError = usePrevious(error);
  const domNodeRef = useRef<HTMLElement>();
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
    if (previousError !== error) {
      updatedHandlers.destroy();
    }
  }, [previousError, error, updatedHandlers]);

  useEffect(() => {
    if (!error) {
      renderTemplate(domNodeRef.current);
    }
  }, [error, renderTemplate, domNodeRef]);

  if (error) {
    return renderErrorTemplate();
  }

  if (!template) {
    return null;
  }

  return (
    <RenderToDom
      render={(domNode) => {
        domNodeRef.current = domNode;
        renderTemplate(domNode);
      }}
    />
  );
};
