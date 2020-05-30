/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChromeBreadcrumb } from '../../../../../src/core/public';
import { platformService } from '../services';

export const getBaseBreadcrumb = () => ({
  text: 'Canvas',
  href: '#/',
});

export const getWorkpadBreadcrumb = ({
  name = 'Workpad',
  id,
}: { name?: string; id?: string } = {}) => {
  const output: ChromeBreadcrumb = { text: name };
  if (id != null) {
    output.href = `#/workpad/${id}`;
  }
  return output;
};

export const setBreadcrumb = (paths: ChromeBreadcrumb | ChromeBreadcrumb[]) => {
  const setBreadCrumbs = platformService.getService().coreStart.chrome.setBreadcrumbs;
  setBreadCrumbs(Array.isArray(paths) ? paths : [paths]);
};
