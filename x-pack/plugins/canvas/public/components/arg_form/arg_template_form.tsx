/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useRef, FC, memo } from 'react';
import deepEqual from 'react-fast-compare';
import usePrevious from 'react-use/lib/usePrevious';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { ExpressionFormHandlers } from '../../../common/lib/expression_form_handlers';
import { UpdatePropsRef } from '../../../types/arguments';

interface ArgTemplateFormProps {
  template?: (
    domNode: HTMLElement,
    config: ArgTemplateFormProps['argumentProps'],
    handlers: ArgTemplateFormProps['handlers'],
    onMount?: (ref: UpdatePropsRef<ArgTemplateFormProps['argumentProps']> | null) => void
  ) => FC<any>;
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

const ArgTemplateFormComponent: React.FunctionComponent<ArgTemplateFormProps> = ({
  template,
  argumentProps,
  handlers,
  error,
  errorTemplate,
}) => {
  const [updatedHandlers, setHandlers] = useState(mergeWithFormHandlers(handlers));
  const prevError = usePrevious(error);
  const mountedArgumentRef = useRef<UpdatePropsRef<ArgTemplateFormProps['argumentProps']>>();

  const domNodeRef = useRef<HTMLDivElement>(null);
  const [argument, setArgument] = useState<FC<any>>();

  useEffectOnce(() => () => {
    console.log('unmounted');
    mountedArgumentRef.current = undefined;
  });

  const onRef = useCallback((ref) => {
    console.log('in onMount');
    if (!mountedArgumentRef.current && ref) {
      mountedArgumentRef.current = ref;
    }
  }, []);

  const renderTemplate = useCallback(
    (domNode) => template && template(domNode, argumentProps, updatedHandlers, onRef),
    [argumentProps, onRef, template, updatedHandlers]
  );

  useEffect(() => {
    if (!argument && domNodeRef.current) {
      const res = renderTemplate(domNodeRef.current);
      if (res) setArgument(res);
    }
  }, [argument, renderTemplate]);

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
