/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RouteComponentProps } from 'react-router-dom';
import { BeatsContainer } from './containers/beats';
import { TagsContainer } from './containers/tags';
import { URLStateProps } from './containers/with_url_state';
import { FrontendLibs } from './lib/types';

export type FlatObject<T> = { [Key in keyof T]: string };

export interface AppURLState {
  beatsKBar?: string;
  tagsKBar?: string;
  enrollmentToken?: string;
  createdTag?: string;
}

export interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  routes?: RouteConfig[];
}

export interface AppPageProps extends URLStateProps<AppURLState>, RouteComponentProps<any> {
  libs: FrontendLibs;
  containers: {
    beats: BeatsContainer;
    tags: TagsContainer;
  };
  routes?: RouteConfig[];
}
