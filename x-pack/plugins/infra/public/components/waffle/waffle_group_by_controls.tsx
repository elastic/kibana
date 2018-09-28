/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
} from '@elastic/eui';
import React from 'react';
import { InfraNodeType, InfraPathInput, InfraPathType } from '../../../common/graphql/types';

interface Props {
  nodeType: InfraNodeType;
  groupBy: InfraPathInput[];
  onChange: (groupBy: InfraPathInput[]) => void;
}

const OPTIONS = {
  [InfraNodeType.pod]: [
    { text: 'Namespace', type: InfraPathType.terms, field: 'kubernetes.namespace' },
    { text: 'Node', type: InfraPathType.terms, field: 'kubernetes.node.name' },
  ],
  [InfraNodeType.container]: [
    { text: 'Host', type: InfraPathType.terms, field: 'host.name' },
    { text: 'Availability Zone', type: InfraPathType.terms, field: 'meta.cloud.availability_zone' },
    { text: 'Machine Type', type: InfraPathType.terms, field: 'meta.cloud.machine_type' },
    { text: 'Project ID', type: InfraPathType.terms, field: 'meta.cloud.project_id' },
    { text: 'Provider', type: InfraPathType.terms, field: 'meta.cloud.provider' },
  ],
  [InfraNodeType.host]: [
    { text: 'Availability Zone', type: InfraPathType.terms, field: 'meta.cloud.availability_zone' },
    { text: 'Machine Type', type: InfraPathType.terms, field: 'meta.cloud.machine_type' },
    { text: 'Project ID', type: InfraPathType.terms, field: 'meta.cloud.project_id' },
    { text: 'Cloud Provider', type: InfraPathType.terms, field: 'meta.cloud.provider' },
  ],
};

const initialState = {
  isPopoverOpen: false,
};
type State = Readonly<typeof initialState>;

export class WaffleGroupByControls extends React.PureComponent<Props, State> {
  public readonly state: State = initialState;
  public render() {
    const { nodeType, groupBy } = this.props;
    const options = OPTIONS[nodeType];
    if (!options.length) {
      throw Error(`Unable to select group by options for ${nodeType}`);
    }
    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 'firstPanel',
        title: 'Select up to two groupings',
        items: options.map(o => {
          const icon = groupBy.some(g => g.field === o.field) ? 'check' : 'empty';
          const panel = { name: o.text, onClick: this.handleClick(o.field), icon };
          return panel;
        }),
      },
    ];
    const buttonBody =
      groupBy.length > 0
        ? groupBy
            .map(g => options.find(o => o.field === g.field))
            .filter(o => o != null)
            // In this map the `o && o.field` is totally unnecessary but Typescript is
            // too stupid to realize that the filter above prevents the next map from being null
            .map(o => (
              <EuiBadge
                key={o && o.field}
                iconType="cross"
                iconOnClick={this.handleRemove((o && o.field) || '')}
                iconOnClickAriaLabel={`Remove ${o && o.text} grouping`}
              >
                {o && o.text}
              </EuiBadge>
            ))
        : 'All';
    const button = (
      <EuiFilterButton iconType="arrowDown" onClick={this.handleToggle}>
        Group By: {buttonBody}
      </EuiFilterButton>
    );

    return (
      <EuiFilterGroup>
        <EuiPopover
          isOpen={this.state.isPopoverOpen}
          id="groupByPanel"
          button={button}
          panelPaddingSize="none"
          closePopover={this.handleClose}
        >
          <EuiContextMenu initialPanelId="firstPanel" panels={panels} />
        </EuiPopover>
      </EuiFilterGroup>
    );
  }

  private handleRemove = (field: string) => () => {
    const { groupBy } = this.props;
    this.props.onChange(groupBy.filter(g => g.field !== field));
    // We need to close the panel after we rmeove the pill icon otherwise
    // it will remain open because the click is still captured by the EuiFilterButton
    setTimeout(() => this.handleClose());
  };

  private handleClose = () => {
    this.setState({ isPopoverOpen: false });
  };

  private handleToggle = () => {
    this.setState(state => ({ isPopoverOpen: !state.isPopoverOpen }));
  };

  private handleClick = (field: string) => () => {
    const { groupBy } = this.props;
    if (groupBy.some(g => g.field === field)) {
      this.handleRemove(field)();
    } else if (this.props.groupBy.length < 2) {
      this.props.onChange([...groupBy, { type: InfraPathType.terms, field }]);
      this.handleClose();
    }
  };
}
