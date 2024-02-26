/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import { isEmpty } from 'lodash';
import { push } from '../links/url_helpers';

export function pushNewItemToKueryBar({
  kuery,
  history,
  key,
  value,
}: {
  kuery?: string;
  history: History;
  key: string;
  value: any;
}) {
  const newItem = `${key} :"${value}"`;
  const nextKuery = isEmpty(kuery) ? newItem : `${kuery} and ${newItem}`;
  push(history, {
    query: { kuery: nextKuery },
  });
}
