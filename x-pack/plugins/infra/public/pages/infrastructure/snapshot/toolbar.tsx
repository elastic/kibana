/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { AutocompleteField } from '../../../components/autocomplete_field';
import { Toolbar } from '../../../components/eui/toolbar';
import { WaffleTimeControls } from '../../../components/waffle/waffle_time_controls';
import { WithWaffleFilter } from '../../../containers/waffle/with_waffle_filters';
import { WithWaffleTime } from '../../../containers/waffle/with_waffle_time';
import { WithKueryAutocompletion } from '../../../containers/with_kuery_autocompletion';
import { WithSource } from '../../../containers/with_source';
import { WithWaffleOptions } from '../../../containers/waffle/with_waffle_options';
import { WaffleInventorySwitcher } from '../../../components/waffle/waffle_inventory_switcher';
import { SearchBar } from '../../inventory_view/compontents/search_bar';

export const SnapshotToolbar = () => (
  <Toolbar>
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
      <EuiFlexItem grow={false}>
        <WithWaffleOptions>
          {({
            changeMetric,
            changeNodeType,
            changeGroupBy,
            changeAccount,
            changeRegion,
            changeCustomMetrics,
            nodeType,
          }) => (
            <WaffleInventorySwitcher
              nodeType={nodeType}
              changeNodeType={changeNodeType}
              changeMetric={changeMetric}
              changeGroupBy={changeGroupBy}
              changeAccount={changeAccount}
              changeRegion={changeRegion}
              changeCustomMetrics={changeCustomMetrics}
            />
          )}
        </WithWaffleOptions>
      </EuiFlexItem>
      <EuiFlexItem>
        <SearchBar />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <WaffleTimeControls />
      </EuiFlexItem>
    </EuiFlexGroup>
  </Toolbar>
);
