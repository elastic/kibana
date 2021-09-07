/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { parse } from 'query-string';
import { Redirect, RouteComponentProps } from 'react-router-dom';

// FIXME? There has to be a way to get these defaults from somewhere else in the metrics app
const QUERY_STRING_TEMPLATE =
  "?waffleTime=(currentTime:{{time}},isAutoReloading:!f)&waffleFilter=(expression:'',kind:kuery)&waffleOptions=(accountId:'',autoBounds:!t,boundsOverride:(max:1,min:0),customMetrics:!(),customOptions:!(),groupBy:!(),legend:(palette:cool,reverseColors:!f,steps:10),metric:(type:cpu),nodeType:host,region:'',sort:(by:name,direction:desc),view:map)";

export const RedirectToInventory: React.FC<RouteComponentProps> = ({ location }) => {
  const parsedQueryString = parseQueryString(location.search);

  const inventoryQueryString = QUERY_STRING_TEMPLATE.replace(/{{(\w+)}}/, (_, key) =>
    parsedQueryString[key].toString()
  );

  return <Redirect to={'/inventory' + inventoryQueryString} />;
};

function parseQueryString(search: string): Record<string, string> {
  if (search.length === 0) {
    return {};
  }

  const obj = parse(search.substring(1));

  // Force all values into `string`
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
