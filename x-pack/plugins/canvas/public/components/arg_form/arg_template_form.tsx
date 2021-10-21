/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useRef, RefObject } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { RenderToDom } from '../render_to_dom';
import { ExpressionFormHandlers } from '../../../common/lib/expression_form_handlers';
import { UpdatePropsRef } from '../../lib/template_from_react_component';

interface ArgTemplateFormProps {
  template?: (
    domNode: HTMLElement,
    config: ArgTemplateFormProps['argumentProps'],
    handlers: ArgTemplateFormProps['handlers'],
    onDone?: (ref: UpdatePropsRef) => void
  ) => RefObject<UpdatePropsRef>;
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
  const [mounted, setMounted] = useState(false);
  const prevError = usePrevious(error);
  const prevMounted = usePrevious(mounted);
  const mountedArgumentRef = useRef<UpdatePropsRef>();

  const domNodeRef = useRef<HTMLElement>();

  const renderTemplate = useCallback(
    (domNode) =>
      template &&
      template(domNode, argumentProps, updatedHandlers, (ref) => {
        if (!mountedArgumentRef.current && ref) {
          mountedArgumentRef.current = ref;
          setMounted(true);
        }
      }),
    [argumentProps, template, updatedHandlers]
  );

  const renderErrorTemplate = useCallback(
    () => React.createElement(errorTemplate, argumentProps),
    [errorTemplate, argumentProps]
  );

  useEffect(() => {
    setHandlers(mergeWithFormHandlers(handlers));
  }, [handlers]);

  useEffect(() => {
    if (!prevError && error) {
      updatedHandlers.destroy();
    }
  }, [prevError, error, updatedHandlers]);

  useEffect(() => {
    if ((!error && prevError && mounted) || (mounted && !prevMounted && !error)) {
      renderTemplate(domNodeRef.current);
    }
  }, [error, mounted, prevError, prevMounted, renderTemplate]);

  useEffect(() => {
    if (mountedArgumentRef.current) {
      mountedArgumentRef.current?.updateProps(argumentProps);
    }
  }, [argumentProps]);

  if (error) {
    mountedArgumentRef.current = undefined;
    return renderErrorTemplate();
  }

  if (!template) {
    mountedArgumentRef.current = undefined;
    return null;
  }

  return (
    <RenderToDom
      render={(domNode) => {
        domNodeRef.current = domNode;
        setMounted(true);
      }}
    />
  );
};
