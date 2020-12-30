/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { FieldDataCardProps } from '../field_data_card';
import { ExamplesList } from '../examples_list';

export const GeoPointContent: FC<FieldDataCardProps> = ({ config }) => {
  // TODO - adjust server-side query to get examples using:

  // GET /filebeat-apache-2019.01.30/_search
  // {
  //   "size":10,
  //   "_source": false,
  //   "docvalue_fields": ["source.geo.location"],
  //    "query": {
  //        "bool":{
  //          "must":[
  //             {
  //                "exists":{
  //                   "field":"source.geo.location"
  //                }
  //             }
  //          ]
  //       }
  //    }
  // }

  const { stats } = config;
  if (stats?.examples === undefined) return null;

  return (
    <div className="mlFieldDataCard__stats">
      <ExamplesList examples={stats.examples} />
    </div>
  );
};
