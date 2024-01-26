/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButton, EuiHorizontalRule } from '@elastic/eui';
import React from 'react';
import { getRouterLinkProps } from '@kbn/router-utils';
import { DiscoverEsqlUrlProps } from '../../../hooks/use_esql';
import { technicalPreview, tryEsql } from '../constants';

export const EsqlSelector = (props: DiscoverEsqlUrlProps) => {
  const linkProps = getRouterLinkProps(props);

  return (
    <>
      <EuiHorizontalRule margin="none" />
      <EuiButton {...linkProps} color="success" size="s" fullWidth data-test-subj="esqlLink">
        {tryEsql}
        <EuiBadge color="hollow">{technicalPreview}</EuiBadge>
      </EuiButton>
    </>
  );
};
