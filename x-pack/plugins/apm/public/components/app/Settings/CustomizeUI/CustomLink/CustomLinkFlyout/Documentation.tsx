/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ElasticDocsLink } from '../../../../../shared/Links/ElasticDocsLink';

interface Props {
  label: string;
}
export const Documentation = ({ label }: Props) => (
  <ElasticDocsLink section="/kibana" path="/custom-links.html" target="_blank">
    {label}
  </ElasticDocsLink>
);
