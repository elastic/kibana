/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  KuiToolBarSection,
  KuiToolBarText,
} from '@kbn/ui-framework/components';
import {
  EuiSwitch,
} from '@elastic/eui';
import { TABLE_ACTION_RESET_PAGING } from '../../../../common/constants';

export class ShowSytemIndicesCheckbox extends React.Component {
  constructor(props) {
    super(props);
    this.state = { showSystemIndices: props.showSystemIndices };
    this.toggleShowSystemIndices = this.toggleShowSystemIndices.bind(this);
  }
  toggleShowSystemIndices(e) {
    const isChecked = Boolean(e.target.checked);
    this.setState({ showSystemIndices: isChecked });
    this.props.toggleShowSystemIndices(isChecked);
    this.props.dispatchTableAction(TABLE_ACTION_RESET_PAGING);
  }
  render() {
    return (
      <KuiToolBarSection>
        <KuiToolBarText>
          <EuiSwitch
            label="System indices"
            onChange={this.toggleShowSystemIndices}
            checked={this.state.showSystemIndices}
          />
        </KuiToolBarText>
      </KuiToolBarSection>
    );
  }
}
