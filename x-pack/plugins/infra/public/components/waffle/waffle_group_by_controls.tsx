/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { InfraIndexField, InfraNodeType, InfraSnapshotGroupbyInput } from '../../graphql/types';
import { InfraGroupByOptions } from '../../lib/lib';
import { CustomFieldPanel } from './custom_field_panel';
import { fieldToName } from './lib/field_to_display_name';

interface Props {
  nodeType: InfraNodeType;
  groupBy: InfraSnapshotGroupbyInput[];
  onChange: (groupBy: InfraSnapshotGroupbyInput[]) => void;
  onChangeCustomOptions: (options: InfraGroupByOptions[]) => void;
  fields: InfraIndexField[];
  intl: InjectedIntl;
  customOptions: InfraGroupByOptions[];
}

const createFieldToOptionMapper = (intl: InjectedIntl) => (field: string) => ({
  text: fieldToName(field, intl),
  field,
});

let OPTIONS: { [P in InfraNodeType]: InfraGroupByOptions[] };
const getOptions = (
  nodeType: InfraNodeType,
  intl: InjectedIntl
): Array<{ text: string; field: string }> => {
  if (!OPTIONS) {
    const mapFieldToOption = createFieldToOptionMapper(intl);
    OPTIONS = {
      [InfraNodeType.pod]: ['kubernetes.namespace', 'kubernetes.node.name', 'service.type'].map(
        mapFieldToOption
      ),
      [InfraNodeType.container]: [
        'host.name',
        'cloud.availability_zone',
        'cloud.machine.type',
        'cloud.project.id',
        'cloud.provider',
        'service.type',
      ].map(mapFieldToOption),
      [InfraNodeType.host]: [
        'cloud.availability_zone',
        'cloud.machine.type',
        'cloud.project.id',
        'cloud.provider',
        'service.type',
      ].map(mapFieldToOption),
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
      const options = getOptions(nodeType, intl).concat(this.props.customOptions);

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
          items: [
            {
              name: intl.formatMessage({
                id: 'xpack.infra.waffle.customGroupByOptionName',
                defaultMessage: 'Custom Field',
              }),
              icon: 'empty',
              panel: 'customPanel',
            },
            ...options.map(o => {
              const icon = groupBy.some(g => g.field === o.field) ? 'check' : 'empty';
              const panel = {
                name: o.text,
                onClick: this.handleClick(o.field),
                icon,
              } as EuiContextMenuPanelItemDescriptor;
              return panel;
            }),
          ],
        },
        {
          id: 'customPanel',
          title: intl.formatMessage({
            id: 'xpack.infra.waffle.customGroupByPanelTitle',
            defaultMessage: 'Group By Custom Field',
          }),
          content: (
            <CustomFieldPanel onSubmit={this.handleCustomField} fields={this.props.fields} />
          ),
        },
      ];
      const buttonBody =
        groupBy.length > 0 ? (
          groupBy
            .map(g => options.find(o => o.field === g.field))
            .filter(o => o != null)
            // In this map the `o && o.field` is totally unnecessary but Typescript is
            // too stupid to realize that the filter above prevents the next map from being null
            .map(o => <EuiBadge key={o && o.field}>{o && o.text}</EuiBadge>)
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
      const options = this.props.customOptions.filter(g => g.field !== field);
      this.props.onChangeCustomOptions(options);
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

    private handleCustomField = (field: string) => {
      const options = [
        ...this.props.customOptions,
        {
          text: field,
          field,
        },
      ];
      this.props.onChangeCustomOptions(options);
      const fn = this.handleClick(field);
      fn();
    };

    private handleClick = (field: string) => () => {
      const { groupBy } = this.props;
      if (groupBy.some(g => g.field === field)) {
        this.handleRemove(field)();
      } else if (this.props.groupBy.length < 2) {
        this.props.onChange([...groupBy, { field }]);
        this.handleClose();
      }
    };
  }
);
