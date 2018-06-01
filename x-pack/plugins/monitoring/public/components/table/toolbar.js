/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash';
import React from 'react';
import {
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiToolBarSection,
  KuiToolBarText
} from '@kbn/ui-framework/components';

export function MonitoringTableToolBar(props) {
  const searchBox = props.showSearchBox
    ? (
      <KuiToolBarSearchBox
        defaultValue={props.filterText}
        onFilter={props.onFilterChange}
        placeholder={props.placeholder}
        data-test-subj="monitoringTableToolBar"
      />
    )
    : null;

  const paginationSection = Boolean(props.paginationControls)
    ? (
      <KuiToolBarSection>
        <KuiToolBarText>
          { props.pageIndexFirstRow } &ndash; { props.pageIndexLastRow } of { props.rowsFiltered }
        </KuiToolBarText>

        { props.paginationControls }
      </KuiToolBarSection>
    )
    : null;

  return (
    <KuiToolBar>
      { searchBox }
      { props.renderToolBarSections(props) }
      { paginationSection }
    </KuiToolBar>
  );
}
MonitoringTableToolBar.defaultProps = {
  renderToolBarSections: noop,
  showSearchBox: true
};
