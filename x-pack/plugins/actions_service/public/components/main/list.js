/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Item } from './item';

export const List = (props) => {
  let list = [];
  if(props.secrets) {
    list = props.secrets.map((it) => {
      return <Item {...it} />;
    });
  }

  return (
    <ul>
      {list}
    </ul>
  );
};
