/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiHorizontalRule, EuiText, EuiLink } from '@elastic/eui';
import { useServices } from '../../context';

const defaultTags: Array<{ color: string; title: string; description: string }> = [
  { color: '#B44B6E', title: 'Environment:Production', description: 'Production environment.' },
  { color: '#B44B6E', title: 'Environment:Staging', description: 'Staging environment.' },
  {
    color: '#B44B6E',
    title: 'Environment:QA',
    description: 'Testing and qulity assurance environment.',
  },
  { color: '#378400', title: 'Feature:Landing page', description: '' },
  { color: '#378400', title: 'Feature:Load balancer', description: '' },
  { color: '#378400', title: 'Feature:GraphQL', description: '' },
  { color: '#378400', title: 'Feature:Sing up form', description: '' },
  { color: '#378400', title: 'Feature:API', description: '' },
  { color: '#378400', title: 'Feature:Message Broker', description: '' },
  { color: '#378400', title: 'Feature:Analytics', description: '' },
  { color: '#D5BB0F', title: 'Team:Design', description: '' },
  { color: '#D5BB0F', title: 'Team:Marketing', description: '' },
  { color: '#378400', title: 'Feature:Reporting', description: '' },
  { color: '#D5BB0F', title: 'Team:Backend', description: '' },
  { color: '#378400', title: 'Feature:Payments', description: '' },
  { color: '#D5BB0F', title: 'Team:Frontend', description: '' },
  { color: '#D5BB0F', title: 'Team:Infrastructure', description: '' },
  { color: '#CA8EAE', title: 'chart', description: '' },
  { color: '#6092C0', title: 'filter', description: '' },
  { color: '#da205e', title: 'graphic', description: '' },
  { color: '#0b7f00', title: 'presentation', description: '' },
  { color: '#49009e', title: 'proportion', description: '' },
  { color: '#dcb400', title: 'report', description: '' },
  { color: '#6b6b6b', title: 'text', description: '' },
];

export const Footer = () => {
  const { manager } = useServices();

  const handleSampleTagsClick = () => {
    for (const tag of defaultTags) manager.create$(tag).subscribe();
  };

  return (
    <>
      <EuiHorizontalRule />
      <EuiText className="eui-textCenter">
        <p>
          Install <EuiLink onClick={handleSampleTagsClick}>sample tags</EuiLink> for this space.
        </p>
      </EuiText>
    </>
  );
};
