/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { i18n } from '@kbn/i18n';
import { modifyUrl } from '@kbn/std';
import rison from 'rison-node';
import { takeEvery } from 'redux-saga/effects';
import { format, parse } from 'url';
import { GraphState, GraphStoreDependencies } from './store';
import { UrlTemplate } from '../types';
import { reset } from './global';
import { setDatasource, IndexpatternDatasource, requestDatasource } from './datasource';
import { outlinkEncoders } from '../helpers/outlink_encoders';
import { urlTemplatePlaceholder } from '../helpers/url_template';
import { matchesOne } from './helpers';

const actionCreator = actionCreatorFactory('x-pack/graph/urlTemplates');

export const loadTemplates = actionCreator<UrlTemplate[]>('LOAD_TEMPLATES');
export const saveTemplate = actionCreator<{ index: number; template: UrlTemplate }>(
  'SAVE_TEMPLATE'
);
export const removeTemplate = actionCreator<UrlTemplate>('REMOVE_TEMPLATE');

export type UrlTemplatesState = UrlTemplate[];

const initialTemplates: UrlTemplatesState = [];

function generateDefaultTemplate(
  datasource: IndexpatternDatasource,
  addBasePath: (url: string) => string
): UrlTemplate {
  const appPath = modifyUrl('/', (parsed) => {
    parsed.query._a = rison.encode({
      columns: ['_source'],
      index: datasource.id,
      interval: 'auto',
      query: { language: 'kuery', query: urlTemplatePlaceholder },
      sort: ['_score', 'desc'],
    });
  });
  const parsedAppPath = parse(`/app/discover#${appPath}`, true, true);
  const formattedAppPath = format({
    protocol: parsedAppPath.protocol,
    host: parsedAppPath.host,
    pathname: parsedAppPath.pathname,
    query: parsedAppPath.query,
    hash: parsedAppPath.hash,
  });

  // replace the URI encoded version of the tag with the unescaped version
  // so it can be found with String.replace, regexp, etc.
  const discoverUrl = addBasePath(formattedAppPath).replace(
    encodeURIComponent(urlTemplatePlaceholder),
    urlTemplatePlaceholder
  );

  return {
    url: discoverUrl,
    description: i18n.translate('xpack.graph.settings.drillDowns.defaultUrlTemplateTitle', {
      defaultMessage: 'Raw documents',
    }),
    encoder: outlinkEncoders[0],
    isDefault: true,
    icon: null,
  };
}

export const urlTemplatesReducer = (addBasePath: (url: string) => string) =>
  reducerWithInitialState(initialTemplates)
    .case(reset, () => initialTemplates)
    .cases([requestDatasource, setDatasource], (templates, datasource) => {
      if (datasource.type === 'none') {
        return initialTemplates;
      }
      const customTemplates = templates.filter((template) => !template.isDefault);
      return [...customTemplates, generateDefaultTemplate(datasource, addBasePath)];
    })
    .case(loadTemplates, (_currentTemplates, newTemplates) => newTemplates)
    .case(saveTemplate, (templates, { index: indexToUpdate, template: updatedTemplate }) => {
      // set default flag to false as soon as template is overwritten.
      const newTemplate = { ...updatedTemplate, isDefault: false };
      return indexToUpdate === -1
        ? [...templates, newTemplate]
        : templates.map((template, index) => (index === indexToUpdate ? newTemplate : template));
    })
    .case(removeTemplate, (templates, templateToDelete) =>
      templates.filter((template) => template !== templateToDelete)
    )
    .build();

export const templatesSelector = (state: GraphState) => state.urlTemplates;

/**
 * Saga making sure the templates are always synced up to the scope.
 *
 * Won't be necessary once the side bar is moved to redux
 */
export const syncTemplatesSaga = ({ notifyReact }: GraphStoreDependencies) => {
  function* syncTemplates() {
    notifyReact();
  }

  return function* () {
    yield takeEvery(
      matchesOne(loadTemplates, saveTemplate, removeTemplate, requestDatasource, setDatasource),
      syncTemplates
    );
  };
};
