/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiHorizontalRule, EuiLink } from '@elastic/eui';

import { ViewContentHeader } from '../../../../components/shared/view_content_header';
import { NAV } from '../../../../constants';
import { OBJECTS_AND_ASSETS_DOCS_URL } from '../../../../routes';
import {
  SOURCE_OBJECTS_AND_ASSETS_DESCRIPTION,
  SYNC_OBJECTS_TYPES_LINK_LABEL,
} from '../../constants';
import { SourceLayout } from '../source_layout';

export const ObjectsAndAssets: React.FC = () => {
  return (
    <SourceLayout
      pageChrome={[NAV.SYNCHRONIZATION_OBJECTS_AND_ASSETS]}
      pageViewTelemetry="source_synchronization"
      isLoading={false}
    >
      <ViewContentHeader
        title={NAV.SYNCHRONIZATION_OBJECTS_AND_ASSETS}
        description={SOURCE_OBJECTS_AND_ASSETS_DESCRIPTION}
      />
      <EuiLink href={OBJECTS_AND_ASSETS_DOCS_URL} external>
        {SYNC_OBJECTS_TYPES_LINK_LABEL}
      </EuiLink>
      <EuiHorizontalRule />
      <div>TODO</div>
    </SourceLayout>
  );
};
