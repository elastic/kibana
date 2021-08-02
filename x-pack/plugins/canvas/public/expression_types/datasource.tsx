/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { RenderToDom } from '../components/render_to_dom';
import { BaseForm } from './base_form';
import { ExpressionFormHandlers } from '../../common/lib';
import { FunctionFormProps } from './function_form';

const defaultTemplate = () => (
  <div>
    <p>This datasource has no interface. Use the expression editor to make changes.</p>
  </div>
);

type TemplateFn = (
  domNode: HTMLElement,
  config: DatasourceProps,
  handlers: ExpressionFormHandlers
) => void;

export type DatasourceProps = {
  template?: TemplateFn;
  image?: string;
  requiresContext?: boolean;
} & FunctionFormProps;

interface DatasourceWrapperProps {
  handlers: ExpressionFormHandlers;
  spec: Datasource;
  datasourceProps: DatasourceProps;
}

const DatasourceWrapper: React.FunctionComponent<DatasourceWrapperProps> = (props) => {
  const domNodeRef = useRef<HTMLElement>();
  const { spec, datasourceProps, handlers } = props;

  const callRenderFn = useCallback(() => {
    const { template } = spec;

    if (!domNodeRef.current) {
      return;
    }

    template(domNodeRef.current, datasourceProps, handlers);
  }, [datasourceProps, handlers, spec]);

  useEffect(() => {
    callRenderFn();
    return () => {
      handlers.destroy();
    };
  }, [callRenderFn, handlers, props]);

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
  requiresContext?: boolean = false;

  constructor(props: DatasourceProps) {
    super(props);

    this.template = props.template ?? defaultTemplate;
    this.image = props.image;
  }

  render(props: DatasourceProps) {
    const expressionFormHandlers = new ExpressionFormHandlers();
    return (
      <DatasourceWrapper spec={this} handlers={expressionFormHandlers} datasourceProps={props} />
    );
  }
}
