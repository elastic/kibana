/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FlyoutFrame } from '../flyout_frame';
import { DrilldownListItem, ListManageDrilldowns } from '../list_manage_drilldowns';
import { FlyoutDrilldownWizard } from '../flyout_drilldown_wizard';
import { txtManageDrilldowns } from './i18n';
import { DrilldownHelloBar } from '../drilldown_hello_bar';

export interface FlyoutManageDrilldownsProps {
  drilldowns: DrilldownListItem[];
  onClose?: () => void;
  showWelcomeMessage?: boolean;
}

enum ViewState {
  List,
  Create,
  Edit,
}

export function FlyoutManageDrilldowns({
  drilldowns,
  onClose = () => {},
  showWelcomeMessage = true,
}: FlyoutManageDrilldownsProps) {
  const [viewState, setViewState] = useState<ViewState>(ViewState.List);

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
        />
      );
    case ViewState.List:
    default:
      return (
        <FlyoutFrame
          title={txtManageDrilldowns}
          onClose={onClose}
          banner={
            showWelcomeMessage && (
              <DrilldownHelloBar
                onHideClick={() => {
                  // TODO:
                }}
              />
            )
          }
        >
          <ListManageDrilldowns
            drilldowns={drilldowns}
            onCreate={() => {
              setViewState(ViewState.Create);
            }}
            onEdit={() => {
              setViewState(ViewState.Edit);
            }}
          />
        </FlyoutFrame>
      );
  }
}
