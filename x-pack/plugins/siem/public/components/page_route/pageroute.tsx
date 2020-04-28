/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

export const PageRoute = (props: { title: string; component: React.ReactType }) => {
  const { title, ...rest } = props;
  useEffect(() => {
    document.title = `${title} - Kibana`;
  }, [title]);
  return <props.component {...rest} />;
};
