/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as t from 'io-ts';
import React from 'react';
import type { Route } from '@kbn/typed-react-router-config';
import { Breadcrumb } from '../../app/breadcrumb';
import { ApmMainTemplate } from '../templates/apm_main_template';

export function page<
  TPath extends string,
  TChildren extends Record<string, Route> | undefined = undefined,
  TParams extends t.Type<any> | undefined = undefined
>({
  path,
  element,
  children,
  title,
  showServiceGroupSaveButton = false,
  environmentFilter = true,
  showPageHeader = true,
  params,
}: {
  path: TPath;
  element: React.ReactElement<any, any>;
  children?: TChildren;
  title: string;
  showServiceGroupSaveButton?: boolean;
  environmentFilter?: boolean;
  showPageHeader?: boolean;
  params?: TParams;
}): Record<
  TPath,
  {
    element: React.ReactElement<any, any>;
  } & (TChildren extends Record<string, Route> ? { children: TChildren } : {}) &
    (TParams extends t.Type<any> ? { params: TParams } : {})
> {
  return {
    [path]: {
      element: (
        <Breadcrumb title={title} href={path} omitOnServerless>
          <ApmMainTemplate
            pageTitle={title}
            showServiceGroupSaveButton={showServiceGroupSaveButton}
            environmentFilter={environmentFilter}
            showPageHeader={showPageHeader}
          >
            {element}
          </ApmMainTemplate>
        </Breadcrumb>
      ),
      children,
      params,
    },
  } as any;
}
