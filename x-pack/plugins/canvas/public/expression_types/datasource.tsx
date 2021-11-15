/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { Ast } from '@kbn/interpreter/common';
import { RenderToDom } from '../components/render_to_dom';
import { BaseForm, BaseFormProps } from './base_form';
import { ExpressionFormHandlers } from '../../common/lib';
import { ExpressionFunction } from '../../types';
import { UpdatePropsRef } from '../../types/arguments';

const defaultTemplate = () => (
  <div>
    <p>This datasource has no interface. Use the expression editor to make changes.</p>
  </div>
);

type TemplateFn = (
  domNode: HTMLElement,
  config: DatasourceRenderProps,
  handlers: ExpressionFormHandlers,
  onMount?: (ref: UpdatePropsRef<DatasourceRenderProps> | null) => void
) => void;

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

const DatasourceWrapper: React.FunctionComponent<DatasourceWrapperProps> = (props) => {
  const domNodeRef = useRef<HTMLElement>();
  const datasourceRef = useRef<UpdatePropsRef<DatasourceRenderProps>>();

  const { spec, datasourceProps, handlers } = props;

  const callRenderFn = useCallback(() => {
    const { template } = spec;

    if (!domNodeRef.current) {
      return;
    }

    template(domNodeRef.current, datasourceProps, handlers, (ref) => {
      datasourceRef.current = ref ?? undefined;
    });
  }, [datasourceProps, handlers, spec]);

  useEffect(() => {
    callRenderFn();
  }, [callRenderFn]);

  useEffect(() => {
    if (datasourceRef.current) {
      datasourceRef.current.updateProps(datasourceProps);
    }
  }, [datasourceProps]);

  useEffectOnce(() => () => {
    datasourceRef.current = undefined;
    handlers.destroy();
  });

  return (
    <RenderToDom
      render={(domNode) => {
        domNodeRef.current = domNode;
        callRenderFn();
      }}
    />
  );
};

export class Datasource extends BaseForm {
  template: TemplateFn | React.FC;
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
