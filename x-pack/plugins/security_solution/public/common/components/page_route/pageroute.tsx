/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

export const PageRoute = (props: {
  title: string;
  component: React.ComponentType<PropsWithChildren>;
}) => {
  const { title, ...rest } = props;
  useEffect(() => {
    document.title = `${title} - Kibana`;
  }, [title]);
  // @ts-expect-error
  return <props.component {...rest} />;
};
