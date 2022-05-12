/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useRef, memo, ReactPortal } from 'react';
import deepEqual from 'react-fast-compare';
import usePrevious from 'react-use/lib/usePrevious';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { ExpressionAstExpression, ExpressionValue } from '@kbn/expressions-plugin';
import { ExpressionFormHandlers } from '../../../common/lib/expression_form_handlers';
import { UpdatePropsRef } from '../../../types/arguments';

export interface ArgTemplateFormProps {
  template?: (
    domNode: HTMLElement,
    config: ArgTemplateFormProps['argumentProps'],
    handlers: ArgTemplateFormProps['handlers'],
    onMount?: (ref: UpdatePropsRef<ArgTemplateFormProps['argumentProps']> | null) => void
  ) => ReactPortal | undefined;
  argumentProps: {
    valueMissing?: boolean;
    label?: string;
    setLabel: (label: string) => void;
    expand?: boolean;
    argValue: any;
    setExpand?: (expand: boolean) => void;
    onValueRemove?: () => void;
    onValueChange: (value: any) => void;
    resetErrorState: () => void;
    renderError: () => void;
    argResolver: (ast: ExpressionAstExpression) => Promise<ExpressionValue>;
  };
  handlers?: { [key: string]: (...args: any[]) => any };
  error?: unknown;
  errorTemplate: React.FunctionComponent<ArgTemplateFormProps['argumentProps']>;
}

const mergeWithFormHandlers = (handlers: ArgTemplateFormProps['handlers']) =>
  Object.assign(new ExpressionFormHandlers(), handlers);

const ArgTemplateFormComponent: React.FunctionComponent<ArgTemplateFormProps> = ({
  template,
  argumentProps,
  handlers,
  error,
  errorTemplate,
}) => {
  const [updatedHandlers, setHandlers] = useState(mergeWithFormHandlers(handlers));
  const prevError = usePrevious(error);
  const [argument, setArgument] = useState<ReactPortal>();

  const mountedArgumentRef = useRef<UpdatePropsRef<ArgTemplateFormProps['argumentProps']>>();
  const domNodeRef = useRef<HTMLDivElement>(null);

  useEffectOnce(() => () => {
    mountedArgumentRef.current = undefined;
  });

  const onMount = useCallback((ref) => {
    if (!mountedArgumentRef.current && ref) {
      mountedArgumentRef.current = ref;
    }
  }, []);

  const renderTemplate = useCallback(
    (domNode) => template && template(domNode, argumentProps, updatedHandlers, onMount),
    [argumentProps, onMount, template, updatedHandlers]
  );

  const renderErrorTemplate = useCallback(
    () => React.createElement(errorTemplate, argumentProps),
    [errorTemplate, argumentProps]
  );

  useEffect(() => {
    if (!argument && domNodeRef.current) {
      const arg = renderTemplate(domNodeRef.current);
      if (arg) {
        setArgument(arg);
      }
    }
  }, [argument, renderTemplate]);

  useEffect(() => {
    setHandlers(mergeWithFormHandlers(handlers));
  }, [handlers]);

  useEffect(() => {
    if (mountedArgumentRef.current) {
      mountedArgumentRef.current?.updateProps(argumentProps);
    }
  }, [argumentProps]);

  useEffect(() => {
    if (!prevError && error) {
      updatedHandlers.destroy();
    }
  }, [prevError, error, updatedHandlers]);

  if (error) {
    mountedArgumentRef.current = undefined;
    return renderErrorTemplate();
  }

  if (!template) {
    mountedArgumentRef.current = undefined;
  }

  return (
    <div className="render_to_dom" ref={domNodeRef}>
      {argument}
    </div>
  );
};

export const ArgTemplateForm = memo(ArgTemplateFormComponent, (prevProps, nextProps) =>
  deepEqual(prevProps, nextProps)
);
