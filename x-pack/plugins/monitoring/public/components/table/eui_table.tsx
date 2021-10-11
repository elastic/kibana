/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FunctionComponent } from 'react';
import { EuiInMemoryTable, EuiButton, EuiSpacer, EuiSearchBar } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIdentifier } from '../setup_mode/formatting';
import { isSetupModeFeatureEnabled } from '../../lib/setup_mode';
import { SetupModeFeature } from '../../../common/enums';

export const EuiMonitoringTable: FunctionComponent<Record<any, any>> = ({
  rows: items,
  search = {},
  columns: _columns,
  setupMode,
  productName,
  ...props
}) => {
  const [hasItems, setHasItem] = React.useState(items.length > 0);

  if (search.box && !search.box['data-test-subj']) {
    search.box['data-test-subj'] = 'monitoringTableToolBar';
  }

  if (search.box && !search.box.schema) {
    search.box.schema = true;
  }

  if (search) {
    const oldOnChange = search.onChange;
    search.onChange = (arg: any) => {
      const filteredItems = EuiSearchBar.Query.execute(arg.query, items, props.executeQueryOptions);
      setHasItem(filteredItems.length > 0);
      if (oldOnChange) {
        oldOnChange(arg);
      }
      return true;
    };
  }

  const columns = _columns.map((column: any) => {
    if (!('sortable' in column)) {
      column.sortable = true;
    }
    return column;
  });

  let footerContent = null;
  if (setupMode && isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
    footerContent = (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiButton iconType="flag" onClick={() => setupMode.openFlyout({}, true)}>
          {i18n.translate('xpack.monitoring.euiTable.setupNewButtonLabel', {
            defaultMessage: 'Monitor another {identifier} with Metricbeat',
            values: {
              identifier: getIdentifier(productName),
            },
          })}
        </EuiButton>
      </Fragment>
    );
  }

  return (
    <div data-test-subj={`${props.className}Container`}>
      <EuiInMemoryTable
        data-test-subj={
          items.length && hasItems === true ? 'monitoringTableHasData' : 'monitoringTableNoData'
        }
        items={items}
        search={search}
        columns={columns}
        {...props}
      />
      {footerContent}
    </div>
  );
};
