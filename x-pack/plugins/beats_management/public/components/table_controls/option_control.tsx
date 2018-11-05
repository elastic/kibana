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
import { isArray } from 'lodash';
import React from 'react';
import { AssignmentControlSchema } from '../table';
import { AssignmentActionType } from '../table';
import { ActionControl } from './action_control';
import { TagBadgeList } from './tag_badge_list';

interface ComponentProps {
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

export class OptionControl extends React.PureComponent<ComponentProps, ComponentState> {
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
    const { items, actionHandler } = this.props;

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
          // onClick: def.lazyLoad ? () => actionHandler(AssignmentActionType.Reload) : undefined,
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
        panel.content = 'Unknown Error.';
      } else if (items.length === 0) {
        panel.content = (
          <EuiPanel>
            <EuiCard
              icon={<EuiIcon size="l" type="bolt" />}
              title="No tags found."
              description="Please create a new configuration tag."
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
    const { itemType, selectionCount, schema } = this.props;

    return (
      <EuiPopover
        button={
          <FixedEuiToolTip
            position="top"
            delay="long"
            content={
              selectionCount === 0
                ? `Select ${itemType} to perform operations such as setting tags and unenrolling Beats.`
                : `Manage your selected ${itemType}`
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
              Manage {itemType}
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
