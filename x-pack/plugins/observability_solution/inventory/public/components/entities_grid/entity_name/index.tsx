/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { ENTITY_DISPLAY_NAME } from '@kbn/observability-shared-plugin/common';
import React from 'react';
import { Entity } from '../../../../common/entities';
import { EntityIcon } from '../../entity_icon';
import { useDetailViewRedirect } from './use_detail_view_redirect';

interface EntityNameProps {
  entity: Entity;
}

export function EntityName({ entity }: EntityNameProps) {
  const { getEntityRedirectUrl } = useDetailViewRedirect();

  const href = getEntityRedirectUrl(entity);

  const entityName = (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={0}>
        <EntityIcon entity={entity} />
      </EuiFlexItem>
      <EuiFlexItem className="eui-textTruncate">
        <span className="eui-textTruncate" data-test-subj="entityNameDisplayName">
          {entity[ENTITY_DISPLAY_NAME]}
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return href ? (
    <EuiLink data-test-subj="entityNameLink" href={href}>
      {entityName}
    </EuiLink>
  ) : (
    entityName
  );
}
