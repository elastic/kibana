/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';

interface Props {
  mappings: boolean;
  settings: boolean;
  aliases: boolean;
}

export const TemplateContentIndicator = ({ mappings, settings, aliases }: Props) => {
  const getColor = (flag: boolean) => (flag ? 'primary' : 'hollow');

  return (
    <>
      <EuiBadge color={getColor(mappings)}>M</EuiBadge>
      <EuiBadge color={getColor(settings)}>S</EuiBadge>
      <EuiBadge color={getColor(aliases)}>A</EuiBadge>
    </>
  );
};
