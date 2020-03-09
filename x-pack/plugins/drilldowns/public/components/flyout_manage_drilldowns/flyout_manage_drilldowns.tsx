/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { DrilldownListItem } from '../list_manage_drilldowns';
import { FlyoutDrilldownWizard } from '../flyout_drilldown_wizard';
import { FlyoutListManageDrilldowns } from '../flyout_list_manage_drilldowns';

export interface FlyoutManageDrilldownsProps {
  drilldowns: DrilldownListItem[];
  onClose?: () => void;
  showWelcomeMessage?: boolean;
  onHideWelcomeMessage?: () => void;
}

enum ViewState {
  List = 'list',
  Create = 'create',
  Edit = 'edit',
}

export function FlyoutManageDrilldowns({
  drilldowns,
  onClose = () => {},
  showWelcomeMessage = true,
  onHideWelcomeMessage,
}: FlyoutManageDrilldownsProps) {
  const [viewState, setViewState] = useState<ViewState>(ViewState.List);

  // TODO: apparently this will be the component with all the state management and data fetching

  switch (viewState) {
    case ViewState.Create:
    case ViewState.Edit:
      return (
        <FlyoutDrilldownWizard
          mode={viewState === ViewState.Create ? 'create' : 'edit'}
          onSubmit={() => setViewState(ViewState.List)}
          onDelete={() => {
            setViewState(ViewState.List);
          }}
          onClose={() => {
            onClose();
          }}
          onBack={() => {
            setViewState(ViewState.List);
          }}
          showWelcomeMessage={showWelcomeMessage}
          onWelcomeHideClick={onHideWelcomeMessage}
        />
      );
    case ViewState.List:
    default:
      return (
        <FlyoutListManageDrilldowns
          drilldowns={drilldowns}
          onClose={onClose}
          showWelcomeMessage={showWelcomeMessage}
          onWelcomeHideClick={onHideWelcomeMessage}
          onCreate={() => {
            setViewState(ViewState.Create);
          }}
          onEdit={() => {
            setViewState(ViewState.Edit);
          }}
          onDelete={() => {}}
        />
      );
  }
}
