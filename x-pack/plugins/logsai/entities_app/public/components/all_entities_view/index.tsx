/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EntityTable } from '../entity_table';
import { EntitiesAppPageHeader } from '../entities_app_page_header';
import { EntitiesAppPageHeaderTitle } from '../entities_app_page_header/entities_app_page_header_title';

export function AllEntitiesView() {
  return (
    <EuiFlexGroup direction="column">
      <EntitiesAppPageHeader>
        <EntitiesAppPageHeaderTitle
          title={i18n.translate('xpack.entities.allEntitiesView.pageHeaderTitle', {
            defaultMessage: 'All entities',
          })}
        />
      </EntitiesAppPageHeader>
      <EntityTable type="all" />
    </EuiFlexGroup>
  );
}
