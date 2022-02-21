/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import classNames from 'classnames';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiLink,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';

import { ComponentTemplateListItem } from '../../../../../common';
import { TemplateContentIndicator } from '../../shared';

import './component_templates_list_item.scss';

interface Action {
  label: string;
  icon: string;
  handler: (component: ComponentTemplateListItem) => void;
}
export interface Props {
  component: ComponentTemplateListItem;
  isSelected?: boolean | ((component: ComponentTemplateListItem) => boolean);
  onViewDetail: (component: ComponentTemplateListItem) => void;
  actions?: Action[];
  dragHandleProps?: { [key: string]: any };
}

export const ComponentTemplatesListItem = ({
  component,
  onViewDetail,
  actions,
  isSelected = false,
  dragHandleProps,
}: Props) => {
  const hasActions = actions && actions.length > 0;
  const isSelectedValue = typeof isSelected === 'function' ? isSelected(component) : isSelected;
  const isDraggable = Boolean(dragHandleProps);

  return (
    <div
      className={classNames('componentTemplatesListItem', {
        'componentTemplatesListItem--selected': isSelectedValue,
      })}
      data-test-subj="item"
    >
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center">
            {isDraggable && (
              <EuiFlexItem>
                <div {...dragHandleProps}>
                  <EuiIcon type="grab" />
                </div>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false} data-test-subj="name">
              {/* <EuiText>{component.name}</EuiText> */}
              <EuiLink onClick={() => onViewDetail(component)}>{component.name}</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="componentTemplatesListItem__contentIndicator">
              <TemplateContentIndicator
                settings={component.hasSettings}
                mappings={component.hasMappings}
                aliases={component.hasAliases}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Actions */}
        {hasActions && !isSelectedValue && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs">
              {actions!.map((action, i) => (
                <EuiFlexItem key={i}>
                  <EuiToolTip content={action.label}>
                    <EuiButtonIcon
                      iconType={action.icon}
                      onClick={() => action.handler(component)}
                      data-test-subj={`action-${action.icon}`}
                      aria-label={action.label}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {/* Check icon when selected */}
      {isSelectedValue && (
        <EuiIcon className="componentTemplatesListItem__checkIcon" type="check" color="success" />
      )}
    </div>
  );
};
