/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { parse } from 'query-string';
import { Redirect, RouteComponentProps } from 'react-router-dom';

// FIXME what would be the right way to build this query string?
const QUERY_STRING_TEMPLATE =
  "?waffleFilter=(expression:'',kind:kuery)&waffleTime=(currentTime:{timestamp},isAutoReloading:!f)&waffleOptions=(accountId:'',autoBounds:!t,boundsOverride:(max:1,min:0),customMetrics:!({customMetric}),customOptions:!(),groupBy:!(),legend:(palette:cool,reverseColors:!f,steps:10),metric:{metric},nodeType:{nodeType},region:'',sort:(by:name,direction:desc),timelineOpen:!f,view:map)";

export const RedirectToInventory: React.FC<RouteComponentProps> = ({ location }) => {
  const parsedQueryString = parseQueryString(location.search);

  const inventoryQueryString = QUERY_STRING_TEMPLATE.replace(
    /{(\w+)}/g,
    (_, key) => parsedQueryString[key] || ''
  );

  return <Redirect to={'/inventory' + inventoryQueryString} />;
};

function parseQueryString(search: string): Record<string, string> {
  if (search.length === 0) {
    return {};
  }

  const obj = parse(search.substring(1));

  // Force all values into string. If they are empty don't create the keys
  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) {
      if (!obj[key]) {
        delete obj[key];
      }
      if (Array.isArray(obj.key)) {
        obj[key] = obj[key]![0];
      }
    }
  }

  return obj as Record<string, string>;
}
