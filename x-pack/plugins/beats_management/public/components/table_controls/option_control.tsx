/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  // @ts-ignore
  EuiCard,
  EuiContextMenu,
  EuiPanel,
  EuiPopover,
  EuiTextColor,
  EuiToolTip,
  EuiToolTipProps,
} from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { isArray } from 'lodash';
import React from 'react';
import { AssignmentControlSchema } from '../table';
import { AssignmentActionType } from '../table';
import { ActionControl } from './action_control';
import { TagBadgeList } from './tag_badge_list';

interface ComponentProps {
  intl: InjectedIntl;
  itemType: string;
  items?: any[];
  schema: AssignmentControlSchema[];
  selectionCount: number;
  actionHandler(action: AssignmentActionType, payload?: any): void;
}

interface ComponentState {
  showPopover: boolean;
}

interface FixedEuiToolTipProps extends EuiToolTipProps {
  delay: 'regular' | 'long';
}
const FixedEuiToolTip = (EuiToolTip as any) as React.SFC<FixedEuiToolTipProps>;

class OptionControlUi extends React.PureComponent<ComponentProps, ComponentState> {
  constructor(props: ComponentProps) {
    super(props);

    this.state = {
      showPopover: false,
    };
  }

  public schemaToPanelTree(
    schemaOrArray: AssignmentControlSchema | AssignmentControlSchema[],
    panels: any = []
  ) {
    const { items, actionHandler, intl } = this.props;

    let schema: AssignmentControlSchema | null = null;
    let schemaArray: AssignmentControlSchema[] | null = null;

    if (isArray(schemaOrArray)) {
      schemaArray = schemaOrArray as AssignmentControlSchema[];
    } else {
      schema = schemaOrArray as AssignmentControlSchema;
    }

    const panel: any = {
      title: schema ? schema.name : undefined,
      id: panels.length,
    };

    if (schemaArray) {
      panel.items = schemaArray.map(def => {
        return {
          onClick: def.lazyLoad ? () => actionHandler(AssignmentActionType.Reload) : undefined,
          panel: def.panel ? def.panel.id : undefined,
          name: def.action ? (
            <ActionControl
              actionHandler={actionHandler}
              action={def.action}
              danger={def.danger}
              name={def.name}
              showWarning={def.showWarning}
              warningHeading={def.warningHeading}
              warningMessage={def.warningMessage}
            />
          ) : (
            <EuiTextColor color={def.danger ? 'danger' : 'default'}>{def.name}</EuiTextColor>
          ),
        };
      });
    } else {
      if (items === undefined) {
        panel.content = intl.formatMessage({
          id: 'xpack.beatsManagement.tableControls.unknownErrorMessage',
          defaultMessage: 'Unknown Error.',
        });
      } else if (items.length === 0) {
        panel.content = (
          <EuiPanel>
            <EuiCard
              icon={<EuiIcon size="l" type="bolt" />}
              title={intl.formatMessage({
                id: 'xpack.beatsManagement.tableControls.noTagsFoundTitle',
                defaultMessage: 'No tags found.',
              })}
              description={intl.formatMessage({
                id: 'xpack.beatsManagement.tableControls.noTagsFoundDescription',
                defaultMessage: 'Please create a new configuration tag.',
              })}
            />
          </EuiPanel>
        );
      } else {
        panel.content = <TagBadgeList items={items} actionHandler={actionHandler} />;
      }
    }

    panels.push(panel);

    if (schemaArray !== null) {
      schemaArray.forEach((item: AssignmentControlSchema) => {
        if (item.panel) {
          this.schemaToPanelTree(item.panel, panels);
        }
      });
    }

    return panels;
  }

  public render() {
    const { itemType, selectionCount, schema, intl } = this.props;

    return (
      <EuiPopover
        button={
          <FixedEuiToolTip
            position="top"
            delay="long"
            content={
              selectionCount === 0
                ? intl.formatMessage(
                    {
                      id: 'xpack.beatsManagement.tableControls.selectItemDescription',
                      defaultMessage:
                        'Select {itemType} to perform operations such as setting tags and unenrolling Beats.',
                    },
                    { itemType }
                  )
                : intl.formatMessage(
                    {
                      id: 'xpack.beatsManagement.tableControls.manageSelectedItemDescription',
                      defaultMessage: 'Manage your selected {itemType}',
                    },
                    { itemType }
                  )
            }
          >
            <EuiButton
              color="primary"
              iconSide="right"
              disabled={selectionCount === 0}
              iconType="arrowDown"
              onClick={() => {
                this.setState({
                  showPopover: true,
                });
              }}
            >
              <FormattedMessage
                id="xpack.beatsManagement.tableControls.manageItemButtonLabel"
                defaultMessage="Manage {itemType}"
                values={{ itemType }}
              />
            </EuiButton>
          </FixedEuiToolTip>
        }
        closePopover={() => {
          this.setState({ showPopover: false });
        }}
        id="assignmentList"
        isOpen={this.state.showPopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        withTitle
      >
        <EuiContextMenu initialPanelId={0} panels={this.schemaToPanelTree(schema)} />
      </EuiPopover>
    );
  }
}

export const OptionControl = injectI18n(OptionControlUi);
