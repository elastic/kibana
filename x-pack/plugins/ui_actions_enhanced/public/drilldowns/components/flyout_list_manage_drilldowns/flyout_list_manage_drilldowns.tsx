/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FlyoutFrame } from '../flyout_frame';
import { DrilldownListItem, ListManageDrilldowns } from '../list_manage_drilldowns';
import { txtManageDrilldowns } from './i18n';
import { DrilldownHelloBar } from '../drilldown_hello_bar';

export interface FlyoutListManageDrilldownsProps {
  docsLink?: string;
  drilldowns: DrilldownListItem[];
  onClose?: () => void;
  onCreate?: () => void;
  onEdit?: (drilldownId: string) => void;
  onDelete?: (drilldownIds: string[]) => void;
  showWelcomeMessage?: boolean;
  onWelcomeHideClick?: () => void;
}

export function FlyoutListManageDrilldowns({
  docsLink,
  drilldowns,
  onClose = () => {},
  onCreate,
  onDelete,
  onEdit,
  showWelcomeMessage = true,
  onWelcomeHideClick,
}: FlyoutListManageDrilldownsProps) {
  return (
    <FlyoutFrame
      title={txtManageDrilldowns}
      onClose={onClose}
      banner={
        showWelcomeMessage && (
          <DrilldownHelloBar docsLink={docsLink} onHideClick={onWelcomeHideClick} />
        )
      }
    >
      <ListManageDrilldowns
        drilldowns={drilldowns}
        onCreate={onCreate}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </FlyoutFrame>
  );
}
