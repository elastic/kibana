/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useCallback, ReactPortal, useState, memo } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import usePrevious from 'react-use/lib/usePrevious';
import deepEqual from 'react-fast-compare';
import { Ast } from '@kbn/interpreter';
import { createPortal } from 'react-dom';
import { BaseForm, BaseFormProps } from './base_form';
import { ExpressionFormHandlers } from '../../common/lib';
import { ExpressionFunction } from '../../types';
import { UpdatePropsRef } from '../../types/arguments';

const defaultTemplate = (domNode: HTMLElement) =>
  createPortal(
    <div>
      <p>This datasource has no interface. Use the expression editor to make changes.</p>
    </div>,
    domNode
  );

type TemplateFn = (
  domNode: HTMLElement,
  config: DatasourceRenderProps,
  handlers: ExpressionFormHandlers,
  onMount?: (ref: UpdatePropsRef<DatasourceRenderProps> | null) => void
) => ReactPortal | undefined;

export type DatasourceProps = {
  template?: TemplateFn;
  image?: string;
  requiresContext?: boolean;
} & BaseFormProps;

export interface DatasourceRenderProps {
  args: Record<string, Array<Ast | string>> | null;
  updateArgs: (...args: any[]) => void;
  datasourceDef: ExpressionFunction;
  isInvalid: boolean;
  setInvalid: (invalid: boolean) => void;
  defaultIndex: string;
  renderError: (...args: any[]) => void;
}

interface DatasourceWrapperProps {
  handlers: ExpressionFormHandlers;
  spec: Datasource;
  datasourceProps: DatasourceRenderProps;
}

const DatasourceWrapperComponent: React.FunctionComponent<DatasourceWrapperProps> = (props) => {
  const domNodeRef = useRef<HTMLDivElement>(null);
  const datasourceRef = useRef<UpdatePropsRef<DatasourceRenderProps>>();
  const [argument, setArgument] = useState<ReactPortal>();

  const { spec, datasourceProps, handlers } = props;
  const prevSpec = usePrevious(spec);

  const onMount = useCallback((ref) => {
    datasourceRef.current = ref ?? undefined;
  }, []);

  const callRenderFn = useCallback(
    (domNode) => {
      const { template } = spec;
      if (!template) {
        return null;
      }
      return template(domNode, datasourceProps, handlers, onMount);
    },
    [datasourceProps, handlers, onMount, spec]
  );

  useEffect(() => {
    if (!argument && domNodeRef.current) {
      const arg = callRenderFn(domNodeRef.current);
      if (arg) {
        setArgument(arg);
      }
    }
  }, [argument, callRenderFn]);

  useEffect(() => {
    if (argument && prevSpec?.name !== spec?.name) {
      setArgument(undefined);
      datasourceRef.current = undefined;
    }
  }, [argument, prevSpec?.name, spec?.name]);

  useEffect(() => {
    if (datasourceRef.current) {
      datasourceRef.current.updateProps(datasourceProps);
    }
  }, [datasourceProps]);

  useEffectOnce(() => {
    datasourceRef.current = undefined;
    return () => {
      datasourceRef.current = undefined;
      handlers.destroy();
    };
  });

  return (
    <div className="render_to_dom" ref={domNodeRef}>
      {argument}
    </div>
  );
};

export const DatasourceWrapper = memo(DatasourceWrapperComponent, (prevProps, nextProps) =>
  deepEqual(prevProps, nextProps)
);

export class Datasource extends BaseForm {
  template?: TemplateFn;
  image?: string;
  requiresContext?: boolean;

  constructor(props: DatasourceProps) {
    super(props);

    this.template = props.template ?? defaultTemplate;
    this.image = props.image;
    this.requiresContext = props.requiresContext;
  }

  render(props: DatasourceRenderProps) {
    const expressionFormHandlers = new ExpressionFormHandlers();
    return (
      <DatasourceWrapper spec={this} handlers={expressionFormHandlers} datasourceProps={props} />
    );
  }
}
