/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Filter } from 'src/plugins/data/public';
import { ActionExecutionContext, Action } from 'src/plugins/ui_actions/public';
import { SetViewControl } from './set_view_control';
import { ToolsControl } from './tools_control';
import { FitToData } from './fit_to_data';
import { GeoFieldWithIndex } from '../../components/geo_field_with_index';

export interface Props {
  addFilters?: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  geoFields: GeoFieldWithIndex[];
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
}

export function ToolbarOverlay(props: Props) {
  function renderToolsControl() {
    const { addFilters, geoFields, getFilterActions, getActionContext } = props;
    if (!addFilters || !geoFields.length) {
      return null;
    }

    return (
      <EuiFlexItem>
        <ToolsControl
          geoFields={geoFields}
          getFilterActions={getFilterActions}
          getActionContext={getActionContext}
        />
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexGroup
      className="mapToolbarOverlay"
      responsive={false}
      direction="column"
      alignItems="flexStart"
      gutterSize="s"
    >
      <EuiFlexItem>
        <SetViewControl />
      </EuiFlexItem>

      <EuiFlexItem>
        <FitToData />
      </EuiFlexItem>

      {renderToolsControl()}
    </EuiFlexGroup>
  );
}
