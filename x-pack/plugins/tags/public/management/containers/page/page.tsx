/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Breadcrumb } from '@elastic/eui';
import { Page as PageUi, Props as PropsUi } from '../../../components/page';
import { useServices } from '../../context';

const crumb: Breadcrumb = { text: 'Tags', href: '/' };

export interface Props extends PropsUi {
  breadcrumbs?: Breadcrumb[];
}

export const Page: React.FC<Props> = ({ breadcrumbs, ...rest }) => {
  const services = useServices();

  useEffect(() => {
    services.params.setBreadcrumbs([crumb, ...(breadcrumbs || [])]);
  }, [services, breadcrumbs]);

  return <PageUi {...rest} />;
};
