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
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { IFieldType } from 'src/plugins/data/public';
import { InfraGroupByOptions } from '../../../../../lib/lib';
import { CustomFieldPanel } from './custom_field_panel';
import { euiStyled } from '../../../../../../../observability/public';
import { InventoryItemType } from '../../../../../../common/inventory_models/types';
import { SnapshotGroupBy } from '../../../../../../common/http_api/snapshot_api';
import { DropdownButton } from '../dropdown_button';

interface Props {
  options: Array<{ text: string; field: string; toolTipContent?: string }>;
  nodeType: InventoryItemType;
  groupBy: SnapshotGroupBy;
  onChange: (groupBy: SnapshotGroupBy) => void;
  onChangeCustomOptions: (options: InfraGroupByOptions[]) => void;
  fields: IFieldType[];
  customOptions: InfraGroupByOptions[];
}

const initialState = {
  isPopoverOpen: false,
};

type State = Readonly<typeof initialState>;

export const WaffleGroupByControls = class extends React.PureComponent<Props, State> {
  public static displayName = 'WaffleGroupByControls';
  public readonly state: State = initialState;

  public render() {
    const { nodeType, groupBy } = this.props;
    const customOptions = this.props.customOptions.map((option) => ({
      ...option,
      toolTipContent: option.text,
    }));
    const options = this.props.options.concat(customOptions);

    if (!options.length) {
      throw Error(
        i18n.translate('xpack.infra.waffle.unableToSelectGroupErrorMessage', {
          defaultMessage: 'Unable to select group by options for {nodeType}',
          values: {
            nodeType,
          },
        })
      );
    }
    const isMaxGroupingsSelected = groupBy.length >= 2;
    const maxGroupByTooltip = i18n.translate('xpack.infra.waffle.maxGroupByTooltip', {
      defaultMessage: 'Only two groupings can be selected at a time',
    });
    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 'firstPanel',
        title: i18n.translate('xpack.infra.waffle.selectTwoGroupingsTitle', {
          defaultMessage: 'Select up to two groupings',
        }),
        items: [
          {
            name: i18n.translate('xpack.infra.waffle.customGroupByOptionName', {
              defaultMessage: 'Custom field',
            }),
            disabled: isMaxGroupingsSelected,
            toolTipContent: isMaxGroupingsSelected ? maxGroupByTooltip : null,
            icon: 'empty',
            panel: 'customPanel',
          },
          ...options.map((o) => {
            const icon = groupBy.some((g) => g.field === o.field) ? 'check' : 'empty';
            const panel = {
              name: o.text,
              onClick: this.handleClick(o.field),
              icon,
            } as EuiContextMenuPanelItemDescriptor;
            if (o.toolTipContent) {
              panel.toolTipContent = o.toolTipContent;
            }
            if (isMaxGroupingsSelected && icon === 'empty') {
              panel.toolTipContent = maxGroupByTooltip;
              panel.disabled = true;
            }
            return panel;
          }),
        ],
      },
      {
        id: 'customPanel',
        title: i18n.translate('xpack.infra.waffle.customGroupByPanelTitle', {
          defaultMessage: 'Group By Custom Field',
        }),
        width: 685,
        content: (
          <CustomFieldPanel
            currentOptions={this.props.customOptions}
            onSubmit={this.handleCustomField}
            fields={this.props.fields}
          />
        ),
      },
    ];
    const buttonBody =
      groupBy.length > 0 ? (
        groupBy
          .map((g) => options.find((o) => o.field === g.field))
          .filter((o) => o != null)
          // In this map the `o && o.field` is totally unnecessary but Typescript is
          // too stupid to realize that the filter above prevents the next map from being null
          .map((o) => (
            <EuiBadge color="hollow" key={o && o.field}>
              {o && o.text}
            </EuiBadge>
          ))
      ) : (
        <FormattedMessage id="xpack.infra.waffle.groupByAllTitle" defaultMessage="All" />
      );

    const button = (
      <DropdownButton
        label={i18n.translate('xpack.infra.waffle.groupByLabel', { defaultMessage: 'Group by' })}
        onClick={this.handleToggle}
      >
        {buttonBody}
      </DropdownButton>
    );

    return (
      <EuiPopover
        isOpen={this.state.isPopoverOpen}
        id="groupByPanel"
        button={button}
        panelPaddingSize="none"
        closePopover={this.handleClose}
      >
        <StyledContextMenu initialPanelId="firstPanel" panels={panels} />
      </EuiPopover>
    );
  }

  private handleRemove = (field: string) => () => {
    const { groupBy } = this.props;
    this.props.onChange(groupBy.filter((g) => g.field !== field));
    const options = this.props.customOptions.filter((g) => g.field !== field);
    this.props.onChangeCustomOptions(options);
    // We need to close the panel after we rmeove the pill icon otherwise
    // it will remain open because the click is still captured by the EuiFilterButton
    setTimeout(() => this.handleClose());
  };

  private handleClose = () => {
    this.setState({ isPopoverOpen: false });
  };

  private handleToggle = () => {
    this.setState((state) => ({ isPopoverOpen: !state.isPopoverOpen }));
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
    if (groupBy.some((g) => g.field === field)) {
      this.handleRemove(field)();
    } else if (this.props.groupBy.length < 2) {
      this.props.onChange([...groupBy, { field }]);
    }
    this.handleClose();
  };
};

const StyledContextMenu = euiStyled(EuiContextMenu)`
  width: 320px;
  & .euiContextMenuItem__text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
