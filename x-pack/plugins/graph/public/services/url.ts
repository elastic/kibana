/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ChromeStart } from '@kbn/core/public';
import { GraphWorkspaceSavedObject } from '../types';
import { MetaDataState } from '../state_management';

export function getHomePath() {
  return '/home';
}

export function getNewPath() {
  return '/workspace';
}

export function getEditPath({ id }: Pick<GraphWorkspaceSavedObject, 'id'>) {
  return `/workspace/${id}`;
}

export function getEditUrl(
  addBasePath: (url: string) => string,
  workspace: Pick<GraphWorkspaceSavedObject, 'id'>
) {
  return addBasePath(`#${getEditPath(workspace)}`);
}

export type SetBreadcrumbOptions =
  | {
      chrome: ChromeStart;
    }
  | {
      chrome: ChromeStart;
      metaData: MetaDataState;
      navigateTo: (path: string) => void;
    };

export function setBreadcrumbs(options: SetBreadcrumbOptions) {
  if ('metaData' in options) {
    options.chrome.setBreadcrumbs([
      {
        text: i18n.translate('xpack.graph.home.breadcrumb', {
          defaultMessage: 'Graph',
        }),
        onClick: () => {
          options.navigateTo(getHomePath());
        },
        'data-test-subj': 'graphHomeBreadcrumb',
      },
      {
        text: options.metaData.title,
        'data-test-subj': 'graphCurrentGraphBreadcrumb',
      },
    ]);
  } else {
    options.chrome.setBreadcrumbs([
      {
        text: i18n.translate('xpack.graph.home.breadcrumb', {
          defaultMessage: 'Graph',
        }),
        href: `#${getHomePath()}`,
        'data-test-subj': 'graphHomeBreadcrumb',
      },
    ]);
  }
}
