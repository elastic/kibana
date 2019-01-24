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
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { InfraNodeType, InfraPathInput, InfraPathType } from '../../graphql/types';

interface Props {
  nodeType: InfraNodeType;
  groupBy: InfraPathInput[];
  onChange: (groupBy: InfraPathInput[]) => void;
  intl: InjectedIntl;
}

let OPTIONS: { [P in InfraNodeType]: Array<{ text: string; type: InfraPathType; field: string }> };
const getOptions = (
  nodeType: InfraNodeType,
  intl: InjectedIntl
): Array<{ text: string; type: InfraPathType; field: string }> => {
  if (!OPTIONS) {
    OPTIONS = {
      [InfraNodeType.pod]: [
        {
          text: intl.formatMessage({
            id: 'xpack.infra.waffle.podGroupByOptions.namespaceLabel',
            defaultMessage: 'Namespace',
          }),
          type: InfraPathType.terms,
          field: 'kubernetes.namespace',
        },
        {
          text: intl.formatMessage({
            id: 'xpack.infra.waffle.podGroupByOptions.nodeLabel',
            defaultMessage: 'Node',
          }),
          type: InfraPathType.terms,
          field: 'kubernetes.node.name',
        },
      ],
      [InfraNodeType.container]: [
        {
          text: intl.formatMessage({
            id: 'xpack.infra.waffle.containerGroupByOptions.hostLabel',
            defaultMessage: 'Host',
          }),
          type: InfraPathType.terms,
          field: 'host.name',
        },
        {
          text: intl.formatMessage({
            id: 'xpack.infra.waffle.containerGroupByOptions.availabilityZoneLabel',
            defaultMessage: 'Availability Zone',
          }),
          type: InfraPathType.terms,
          field: 'meta.cloud.availability_zone',
        },
        {
          text: intl.formatMessage({
            id: 'xpack.infra.waffle.containerGroupByOptions.machineTypeLabel',
            defaultMessage: 'Machine Type',
          }),
          type: InfraPathType.terms,
          field: 'meta.cloud.machine_type',
        },
        {
          text: intl.formatMessage({
            id: 'xpack.infra.waffle.containerGroupByOptions.projectIDLabel',
            defaultMessage: 'Project ID',
          }),
          type: InfraPathType.terms,
          field: 'meta.cloud.project_id',
        },
        {
          text: intl.formatMessage({
            id: 'xpack.infra.waffle.containerGroupByOptions.providerLabel',
            defaultMessage: 'Provider',
          }),
          type: InfraPathType.terms,
          field: 'meta.cloud.provider',
        },
      ],
      [InfraNodeType.host]: [
        {
          text: intl.formatMessage({
            id: 'xpack.infra.waffle.hostGroupByOptions.availabilityZoneLabel',
            defaultMessage: 'Availability Zone',
          }),
          type: InfraPathType.terms,
          field: 'meta.cloud.availability_zone',
        },
        {
          text: intl.formatMessage({
            id: 'xpack.infra.waffle.hostGroupByOptions.machineTypeLabel',
            defaultMessage: 'Machine Type',
          }),
          type: InfraPathType.terms,
          field: 'meta.cloud.machine_type',
        },
        {
          text: intl.formatMessage({
            id: 'xpack.infra.waffle.hostGroupByOptions.projectIDLabel',
            defaultMessage: 'Project ID',
          }),
          type: InfraPathType.terms,
          field: 'meta.cloud.project_id',
        },
        {
          text: intl.formatMessage({
            id: 'xpack.infra.waffle.hostGroupByOptions.cloudProviderLabel',
            defaultMessage: 'Cloud Provider',
          }),
          type: InfraPathType.terms,
          field: 'meta.cloud.provider',
        },
      ],
    };
  }

  return OPTIONS[nodeType];
};

const initialState = {
  isPopoverOpen: false,
};

type State = Readonly<typeof initialState>;

export const WaffleGroupByControls = injectI18n(
  class extends React.PureComponent<Props, State> {
    public static displayName = 'WaffleGroupByControls';
    public readonly state: State = initialState;

    public render() {
      const { nodeType, groupBy, intl } = this.props;
      const options = getOptions(nodeType, intl);

      if (!options.length) {
        throw Error(
          intl.formatMessage(
            {
              id: 'xpack.infra.waffle.unableToSelectGroupErrorMessage',
              defaultMessage: 'Unable to select group by options for {nodeType}',
            },
            {
              nodeType,
            }
          )
        );
      }
      const panels: EuiContextMenuPanelDescriptor[] = [
        {
          id: 'firstPanel',
          title: intl.formatMessage({
            id: 'xpack.infra.waffle.selectTwoGroupingsTitle',
            defaultMessage: 'Select up to two groupings',
          }),
          items: options.map(o => {
            const icon = groupBy.some(g => g.field === o.field) ? 'check' : 'empty';
            const panel = { name: o.text, onClick: this.handleClick(o.field), icon };
            return panel;
          }),
        },
      ];
      const buttonBody =
        groupBy.length > 0 ? (
          groupBy
            .map(g => options.find(o => o.field === g.field))
            .filter(o => o != null)
            // In this map the `o && o.field` is totally unnecessary but Typescript is
            // too stupid to realize that the filter above prevents the next map from being null
            .map(o => (
              <EuiBadge
                key={o && o.field}
                iconType="cross"
                iconOnClick={this.handleRemove((o && o.field) || '')}
                iconOnClickAriaLabel={intl.formatMessage(
                  {
                    id: 'xpack.infra.waffle.removeGroupingItemAriaLabel',
                    defaultMessage: 'Remove {groupingItem} grouping',
                  },
                  {
                    groupingItem: o && o.text,
                  }
                )}
              >
                {o && o.text}
              </EuiBadge>
            ))
        ) : (
          <FormattedMessage id="xpack.infra.waffle.groupByAllTitle" defaultMessage="All" />
        );
      const button = (
        <EuiFilterButton iconType="arrowDown" onClick={this.handleToggle}>
          <FormattedMessage
            id="xpack.infra.waffle.groupByButtonLabel"
            defaultMessage="Group By: "
          />
          {buttonBody}
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
);
